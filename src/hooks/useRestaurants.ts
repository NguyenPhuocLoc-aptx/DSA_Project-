// src/hooks/useRestaurants.ts
import { useState, useEffect, useMemo } from 'react';
import { KDTree, KDPoint } from '../dsa/KDTree';
import { Trie } from '../dsa/Trie';
import { fetchOSMRoadNetwork, OSMRoadNetwork } from '../lib/fetchOSMRoadNetwork';

export interface Restaurant extends KDPoint {
  id: string;
  name: string;
  type: 'restaurant' | 'cafe' | 'fast_food';
  rating: number;
  address: string;
  lat: number;
  lng: number;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function fetchRestaurantsFromOverpass(
  lat: number,
  lng: number,
  radiusM = 2500
): Promise<Restaurant[]> {
  const query = `
    [out:json][timeout:60];
    node["amenity"~"restaurant|cafe|fast_food"](around:${radiusM},${lat},${lng});
    out;
  `;
  const res = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const data = await res.json();

  return (data.elements as any[]).map((el) => ({
    id: el.id.toString(),
    lat: el.lat as number,
    lng: el.lon as number,
    name: (el.tags?.name as string) || 'Quán chưa đặt tên',
    type: (el.tags?.amenity as Restaurant['type']) ?? 'restaurant',
    rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
    address: (el.tags?.['addr:street'] as string) || 'Linh Trung, Thủ Đức',
  }));
}

export interface UseRestaurantsReturn {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  kdTree: KDTree | null;
  trie: Trie | null;
  osmNetwork: OSMRoadNetwork | null;
  osmKDTree: KDTree | null;
  osmLoading: boolean;
}

export function useRestaurants(lat: number, lng: number, radiusM = 2500): UseRestaurantsReturn {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [osmNetwork, setOsmNetwork] = useState<OSMRoadNetwork | null>(null);
  const [osmLoading, setOsmLoading] = useState(true);

  // Fetch restaurants within radiusM
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRestaurantsFromOverpass(lat, lng, radiusM)
      .then((data) => {
        if (!cancelled) { setRestaurants(data); setLoading(false); }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [lat, lng, radiusM]);

  // Fetch OSM road network with a slightly larger radius to cover snapping
  useEffect(() => {
    let cancelled = false;
    setOsmLoading(true);
    const roadRadiusM = radiusM + 500;
    fetchOSMRoadNetwork(lat, lng, roadRadiusM)
      .then((network) => {
        if (!cancelled) { setOsmNetwork(network); setOsmLoading(false); }
      })
      .catch((err) => {
        console.error('OSM road network fetch failed:', err);
        if (!cancelled) setOsmLoading(false);
      });
    return () => { cancelled = true; };
  }, [lat, lng, radiusM]);

  const kdTree = useMemo(
    () => (restaurants.length > 0 ? new KDTree(restaurants) : null),
    [restaurants]
  );

  const trie = useMemo(() => {
    if (restaurants.length === 0) return null;
    const t = new Trie();
    for (const r of restaurants) t.insert(r.name, r.id);
    return t;
  }, [restaurants]);

  const osmKDTree = useMemo(
    () => (osmNetwork ? new KDTree(osmNetwork.nodes) : null),
    [osmNetwork]
  );

  return { restaurants, loading, error, kdTree, trie, osmNetwork, osmKDTree, osmLoading };
}