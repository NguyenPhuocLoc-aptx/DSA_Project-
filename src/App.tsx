import React, { useState, useEffect, useMemo } from 'react';
import { 
  Utensils, 
  Search, 
  Navigation, 
  UserCircle, 
  Compass, 
  Heart, 
  History, 
  Bookmark, 
  Settings, 
  MapPin, 
  Clock, 
  Phone, 
  Navigation2, 
  Share2, 
  Star,
  Coffee,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- TYPES & CONSTANTS ---
interface Point {
  lat: number;
  lng: number;
}

interface Restaurant extends Point {
  id: string;
  name: string;
  type: string;
  rating: number;
  address: string;
}

interface GraphNode extends Point {
  id: string;
}

interface Edge {
  to: string;
  weight: number;
}

const UI_LOCATION: [number, number] = [10.8752, 106.8016]; // International University, VNU-HCM

// --- ALGORITHMS ---

/**
 * QUICK SORT (DSA)
 * Sorts restaurants by rating descending
 */
function quickSort(arr: Restaurant[]): Restaurant[] {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x.rating > pivot.rating);
  const middle = arr.filter(x => x.rating === pivot.rating);
  const right = arr.filter(x => x.rating < pivot.rating);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

/**
 * LINEAR SEARCH (DSA)
 * Find restaurant by name
 */
function linearSearch(arr: Restaurant[], query: string): Restaurant[] {
  const result: Restaurant[] = [];
  const q = query.toLowerCase();
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].name.toLowerCase().includes(q)) {
      result.push(arr[i]);
    }
  }
  return result;
}

/**
 * DIJKSTRA (DSA)
 */
function dijkstra(graph: Record<string, Edge[]>, startNode: string, endNode: string) {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const nodes = new Set(Object.keys(graph));

  for (const node of nodes) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[startNode] = 0;

  while (nodes.size > 0) {
    let closestNode: string | null = null;
    for (const node of nodes) {
      if (closestNode === null || distances[node] < distances[closestNode]) {
        closestNode = node;
      }
    }

    if (closestNode === null || distances[closestNode] === Infinity || closestNode === endNode) {
      break;
    }

    nodes.delete(closestNode);

    for (const edge of graph[closestNode] || []) {
      const alt = distances[closestNode] + edge.weight;
      if (alt < distances[edge.to]) {
        distances[edge.to] = alt;
        previous[edge.to] = closestNode;
      }
    }
  }

  const path: string[] = [];
  let curr: string | null = endNode;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous[curr];
  }
  return path;
}

// --- HELPERS ---
const createMarkerIcon = (color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="flex flex-col items-center">
      <div class="bg-[${color}] text-white p-2 rounded-full shadow-lg border-2 border-white transform hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
      </div>
      <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-[${color}] -mt-1 shadow-sm"></div>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// --- MAIN APP ---
export default function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [routingPath, setRoutingPath] = useState<[number, number][]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(UI_LOCATION);

  // 1. Fetching Data from Overpass API
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const query = `
          [out:json];
          node["amenity"~"restaurant|cafe|fast_food"](around:2500, ${UI_LOCATION[0]}, ${UI_LOCATION[1]});
          out;
        `;
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        const mapped: Restaurant[] = data.elements.map((el: any) => ({
          id: el.id.toString(),
          lat: el.lat,
          lng: el.lon,
          name: el.tags.name || "Quán Ăn Chưa Đặt Tên",
          type: el.tags.amenity,
          rating: parseFloat((Math.random() * (5 - 3.5) + 3.5).toFixed(1)), // 2. Random Rating 3.5 - 5.0
          address: el.tags["addr:street"] || "Học xá Thủ Đức, TP.HCM"
        }));

        setRestaurants(mapped);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching Overpass data", error);
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  // 3a. Sorting by Rating (Quick Sort)
  const sortedRestaurants = useMemo(() => {
    return quickSort(restaurants);
  }, [restaurants]);

  // 3b. Search (Linear Search)
  const filteredRestaurants = useMemo(() => {
    if (!searchQuery) return sortedRestaurants;
    return linearSearch(sortedRestaurants, searchQuery);
  }, [sortedRestaurants, searchQuery]);

  // 3c. Dijkstra Pathfinding Simulation
  const handleFindShortestPath = (target: Restaurant) => {
    const junctions: Record<string, GraphNode> = {
      'iu': { id: 'iu', lat: UI_LOCATION[0], lng: UI_LOCATION[1] },
      'gate': { id: 'gate', lat: 10.8760, lng: 106.8025 },
      'crossroad': { id: 'crossroad', lat: 10.8740, lng: 106.8000 },
      'target': { id: 'target', lat: target.lat, lng: target.lng }
    };

    const graph: Record<string, Edge[]> = {
      'iu': [{ to: 'gate', weight: 1 }, { to: 'crossroad', weight: 2 }],
      'gate': [{ to: 'iu', weight: 1 }, { to: 'target', weight: 3 }],
      'crossroad': [{ to: 'iu', weight: 1 }, { to: 'target', weight: 2 }],
      'target': [{ to: 'gate', weight: 3 }, { to: 'crossroad', weight: 2 }]
    };

    const pathIds = dijkstra(graph, 'iu', 'target');
    const pathCoords = pathIds.map(id => [junctions[id].lat, junctions[id].lng] as [number, number]);
    setRoutingPath(pathCoords);
    setSelectedRestaurant(target);
    setMapCenter([target.lat, target.lng]);
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#f9f9ff]">
      {/* Top Navbar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-[#c1c6d6] bg-white/90 backdrop-blur-md z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#005bbf]/10 p-2 rounded-xl">
            <Utensils className="w-6 h-6 text-[#005bbf]" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#005bbf] tracking-tight block leading-none">CulinaryGuide</span>
            <span className="text-[10px] text-[#414754] font-medium tracking-widest uppercase">IU Campus edition</span>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#727785]" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-11 rounded-2xl bg-[#f0f3ff] border border-[#c1c6d6] focus:ring-2 focus:ring-[#005bbf]/20 text-sm font-medium transition-all outline-none"
              placeholder="Tìm kiếm bằng Linear Search..."
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[#111c2d]">VNU-HCM IU</p>
            <p className="text-[10px] text-[#727785]">Linh Trung, Thủ Đức</p>
          </div>
          <button className="p-1 rounded-full border-2 border-[#005bbf]/20">
            <UserCircle className="w-8 h-8 text-[#414754]" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-[#c1c6d6] bg-white flex flex-col z-40 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b border-[#c1c6d6] bg-[#f0f3ff]/30">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">Xếp hạng theo Rating</h2>
              <span className="text-[10px] bg-[#005bbf] text-white px-2 py-0.5 rounded-full font-bold">Quick Sort</span>
            </div>
            <p className="text-xs text-[#414754]">Danh sách sắp xếp từ cao đến thấp</p>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[#727785]">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-medium">Đang quét OSM dữ liệu IU...</span>
              </div>
            ) : filteredRestaurants.length > 0 ? (
              <div className="divide-y divide-[#c1c6d6]/30">
                {filteredRestaurants.map((res, index) => (
                  <motion.button
                    key={res.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => {
                      setSelectedRestaurant(res);
                      setMapCenter([res.lat, res.lng]);
                    }}
                    className={`w-full p-4 text-left hover:bg-[#f0f3ff] transition-all flex gap-4 ${selectedRestaurant?.id === res.id ? 'bg-[#1a73e8]/5 border-l-4 border-[#005bbf]' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#dee8ff] flex items-center justify-center shrink-0">
                      {res.type === 'cafe' ? <Coffee className="w-5 h-5 text-[#944a00]" /> : <Utensils className="w-5 h-5 text-[#005bbf]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#111c2d] truncate">{res.name}</h3>
                        <div className="flex items-center gap-1 bg-[#fdaf0a]/20 px-1.5 py-0.5 rounded-md shrink-0">
                          <Star className="w-3 h-3 fill-current text-[#805600]" />
                          <span className="text-[10px] font-bold text-[#805600]">{res.rating}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#727785] truncate mt-1">{res.address}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#727785]">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Không thấy quán nào qua Linear Search</p>
              </div>
            )}
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative z-10">
          <MapContainer 
            center={UI_LOCATION} 
            zoom={16} 
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController center={mapCenter} zoom={17} />

            <Marker position={UI_LOCATION} icon={L.divIcon({
              className: 'iu-marker',
              html: `<div class="w-10 h-10 bg-black rounded-full border-4 border-white shadow-2xl flex flex-col items-center justify-center text-white text-[10px] font-bold"><span>IU</span><div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div></div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            })}>
              <Popup>Vị trí của bạn: ĐH Quốc Tế</Popup>
            </Marker>

            {routingPath.length > 0 && (
              <Polyline positions={routingPath} color="#005bbf" weight={6} opacity={0.8} dashArray="5, 10" />
            )}

            {filteredRestaurants.map(res => (
              <Marker 
                key={res.id}
                position={[res.lat, res.lng]}
                icon={createMarkerIcon(res.type === 'cafe' ? '#944a00' : '#005bbf')}
                eventHandlers={{ click: () => setSelectedRestaurant(res) }}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                       <h4 className="font-bold text-sm text-[#005bbf] m-0">{res.name}</h4>
                       <div className="bg-[#fdaf0a]/20 text-[#805600] px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                         <Star className="w-3 h-3 fill-current" /> {res.rating}
                       </div>
                    </div>
                    <p className="text-[10px] text-[#414754] mb-3">{res.address}</p>
                    <button 
                      onClick={() => handleFindShortestPath(res)}
                      className="w-full h-9 bg-[#005bbf] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-[#1a73e8] transition-colors shadow-lg"
                    >
                      <Navigation2 className="w-3 h-3" /> Đường ngắn nhất (Dijkstra)
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Quick Details */}
          <AnimatePresence>
            {selectedRestaurant && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-8 right-8 left-8 md:left-auto md:w-[400px] p-5 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#c1c6d6] z-40 flex gap-5"
              >
                <div className="w-20 h-20 rounded-2xl bg-[#005bbf]/10 flex items-center justify-center shrink-0">
                  <Utensils className="w-10 h-10 text-[#005bbf]" />
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start">
                     <h3 className="font-bold text-xl text-[#111c2d] truncate">{selectedRestaurant.name}</h3>
                     <button onClick={() => { setSelectedRestaurant(null); setRoutingPath([]); }} className="text-[#727785] hover:text-[#111c2d]"><X className="w-5 h-5" /></button>
                   </div>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs font-bold text-[#805600]">{selectedRestaurant.rating}</span>
                     <div className="flex text-[#fdaf0a]">
                       {[...Array(5)].map((_, i) => (
                         <Star key={i} className={`w-3 h-3 ${i < Math.floor(selectedRestaurant.rating) ? 'fill-current' : ''}`} />
                       ))}
                     </div>
                   </div>
                   <div className="mt-4 flex gap-3">
                     <button 
                      onClick={() => handleFindShortestPath(selectedRestaurant)}
                      className="flex-1 h-11 bg-[#005bbf] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,91,191,0.3)]"
                     >
                       <Navigation2 className="w-4 h-4" /> Bắt đầu chỉ đường
                     </button>
                     <button className="w-11 h-11 flex items-center justify-center rounded-2xl border border-[#c1c6d6] text-[#414754] hover:bg-[#f0f3ff] transition-all">
                       <Share2 className="w-4 h-4" />
                     </button>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
