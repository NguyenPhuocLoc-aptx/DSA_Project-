import express, { Request, Response } from 'express';

interface DistrictInfo {
  name: string;
  bbox: string;
  description: string;
}

interface Restaurant {
  id: string;
  name: string;
  amenity: string;
  lat: number;
  lng: number;
  address: string;
  district?: string;
  tags: Record<string, string>;
}

const DISTRICTS: Record<string, DistrictInfo> = {
  '1': {
    name: 'Quận 1',
    bbox: '10.76742,106.69000,10.78914,106.71308',
    description: 'Trung tâm Quận 1, quanh Chợ Bến Thành và Nhà thờ Đức Bà',
  },
  '3': {
    name: 'Quận 3',
    bbox: '10.77224,106.67949,10.79156,106.70175',
    description: 'Khu Quận 3 và đường Nguyễn Thị Minh Khai',
  },
  '5': {
    name: 'Quận 5',
    bbox: '10.75755,106.67976,10.77460,106.71232',
    description: 'Khu Chợ Lớn và quận 5',
  },
  '10': {
    name: 'Quận 10',
    bbox: '10.76883,106.65572,10.78895,106.68930',
    description: 'Khu vực Quận 10, gần Đường 3/2',
  },
  'binh-thanh': {
    name: 'Bình Thạnh',
    bbox: '10.78292,106.69328,10.81518,106.72597',
    description: 'Khu vực Bình Thạnh và cầu Thị Nghè',
  },
  'phu-nhuan': {
    name: 'Phú Nhuận',
    bbox: '10.79148,106.66692,10.81682,106.69689',
    description: 'Khu vực Phú Nhuận, đường Phan Xích Long và Nguyễn Kiệm',
  },
  'thu-duc': {
    name: 'Thủ Đức',
    bbox: '10.83470,106.75700,10.89040,106.82860',
    description: 'Khu vực Đại học Quốc tế và Linh Trung',
  },
  'go-vap': {
    name: 'Gò Vấp',
    bbox: '10.80523,106.61888,10.86474,106.70418',
    description: 'Khu vực Gò Vấp và Đường Quang Trung',
  },
  'tan-binh': {
    name: 'Tân Bình',
    bbox: '10.79146,106.63826,10.82729,106.69540',
    description: 'Khu vực Tân Bình, gần sân bay Tân Sơn Nhất',
  },
};

const PORT = Number(process.env.PORT || 4000);
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 phút
const cache = new Map<string, { expiresAt: number; payload: unknown }>();

const app = express();

app.use(express.json());
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

function getCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCache(key: string, payload: unknown) {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
}

function sanitizeBBox(bbox: string) {
  const parts = bbox.split(',').map(part => Number(part.trim()));
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error('bbox phải có 4 giá trị số và phân cách bằng dấu phẩy');
  }
  return parts.join(',');
}

function buildOverpassQuery(bbox: string, amenities: string) {
  return `
    [out:json][timeout:180];
    (
      node["amenity"~"${amenities}"](${bbox});
      way["amenity"~"${amenities}"](${bbox});
      relation["amenity"~"${amenities}"](${bbox});
    );
    out center tags;
  `;
}

function normalizeElement(element: any, district?: string): Restaurant | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  const tags = element.tags ?? {};
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const addressParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:ward'],
    tags['addr:district'],
    tags['addr:city'],
  ].filter(Boolean);

  return {
    id: `${element.type}/${element.id}`,
    name: tags.name || 'Quán chưa có tên',
    amenity: tags.amenity || 'unknown',
    lat,
    lng,
    address: addressParts.join(', ') || 'Địa chỉ chưa rõ',
    district,
    tags,
  };
}

async function fetchOverpass(query: string) {
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Overpass trả về mã ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function loadRestaurants(options: {
  district?: string;
  bbox?: string;
  amenities: string;
}) {
  const districtKey = options.district?.toLowerCase();
  const districtInfo = districtKey ? DISTRICTS[districtKey] : undefined;
  const resolvedBBox = districtInfo ? districtInfo.bbox : options.bbox;

  if (!resolvedBBox) {
    throw new Error('Phải cung cấp district hoặc bbox hợp lệ');
  }

  const safeBBox = sanitizeBBox(resolvedBBox);
  const cacheKey = `restaurants:${districtKey ?? 'custom'}:${safeBBox}:${options.amenities}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return cached as Restaurant[];
  }

  const query = buildOverpassQuery(safeBBox, options.amenities);
  const data = await fetchOverpass(query);
  const restaurants: Restaurant[] = (data.elements ?? [])
    .map((element: any) => normalizeElement(element, districtInfo?.name))
    .filter((item: Restaurant | null): item is Restaurant => item !== null);

  setCache(cacheKey, restaurants);
  return restaurants;
}

app.get('/api/districts', (req: Request, res: Response) => {
  const districts = Object.entries(DISTRICTS).map(([key, value]) => ({
    key,
    name: value.name,
    bbox: value.bbox,
    description: value.description,
  }));
  res.json({ count: districts.length, districts });
});

app.get('/api/restaurants', async (req: Request, res: Response) => {
  try {
    const district = typeof req.query.district === 'string' ? req.query.district : undefined;
    const bbox = typeof req.query.bbox === 'string' ? req.query.bbox : undefined;
    const amenities = typeof req.query.amenities === 'string'
      ? req.query.amenities
      : 'restaurant|cafe|fast_food';
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 0;

    if (!district && !bbox) {
      return res.status(400).json({ error: 'Bạn phải cung cấp district hoặc bbox.' });
    }

    const restaurants = await loadRestaurants({ district, bbox, amenities });
    const result = limit > 0 ? restaurants.slice(0, limit) : restaurants;

    res.json({
      meta: {
        district: district || null,
        bbox: bbox || (district ? DISTRICTS[district.toLowerCase()]?.bbox : null),
        amenities,
        total: restaurants.length,
        returned: result.length,
      },
      restaurants: result,
    });
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Lỗi server' });
  }
});

app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const district = typeof req.query.district === 'string' ? req.query.district : undefined;
    const bbox = typeof req.query.bbox === 'string' ? req.query.bbox : undefined;
    const amenities = typeof req.query.amenities === 'string'
      ? req.query.amenities
      : 'restaurant|cafe|fast_food';
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 0;

    if (!query) {
      return res.status(400).json({ error: 'Bạn phải cung cấp tham số q để tìm kiếm.' });
    }
    if (!district && !bbox) {
      return res.status(400).json({ error: 'Bạn phải cung cấp district hoặc bbox để giới hạn search.' });
    }

    const restaurants = await loadRestaurants({ district, bbox, amenities });
    const normalizedQuery = query.toLowerCase();
    const filtered = restaurants.filter((restaurant) => {
      return (
        restaurant.name.toLowerCase().includes(normalizedQuery) ||
        restaurant.address.toLowerCase().includes(normalizedQuery) ||
        restaurant.amenity.toLowerCase().includes(normalizedQuery) ||
        Object.values(restaurant.tags).some((value) =>
          String(value).toLowerCase().includes(normalizedQuery),
        )
      );
    });

    res.json({
      meta: {
        query,
        district: district || null,
        bbox: bbox || (district ? DISTRICTS[district.toLowerCase()]?.bbox : null),
        total: filtered.length,
        returned: limit > 0 ? Math.min(limit, filtered.length) : filtered.length,
      },
      restaurants: limit > 0 ? filtered.slice(0, limit) : filtered,
    });
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Lỗi server' });
  }
});

app.listen(PORT, () => {
  console.log(`API server chạy trên http://localhost:${PORT}`);
});
