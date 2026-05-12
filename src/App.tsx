import { useMemo, useState } from 'react';
import { Search, UserCircle, Utensils } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import { UI_LOCATION, useRestaurants, type Restaurant } from './hooks/useRestaurants';

interface GraphNode {
  id: string;
  lat: number;
  lng: number;
}

interface Edge {
  to: string;
  weight: number;
}

function quickSort(arr: Restaurant[]): Restaurant[] {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter((x) => x.rating > pivot.rating);
  const middle = arr.filter((x) => x.rating === pivot.rating);
  const right = arr.filter((x) => x.rating < pivot.rating);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

function linearSearch(arr: Restaurant[], query: string): Restaurant[] {
  const result: Restaurant[] = [];
  const q = query.toLowerCase();
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i].name.toLowerCase().includes(q)) {
      result.push(arr[i]);
    }
  }
  return result;
}

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

export default function App() {
  const { restaurants, loading } = useRestaurants();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [routingPath, setRoutingPath] = useState<[number, number][]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(UI_LOCATION);

  const sortedRestaurants = useMemo(() => quickSort(restaurants), [restaurants]);
  const filteredRestaurants = useMemo(() => {
    if (!searchQuery) return sortedRestaurants;
    return linearSearch(sortedRestaurants, searchQuery);
  }, [sortedRestaurants, searchQuery]);

  const handleSelectRestaurant = (res: Restaurant | null) => {
    setSelectedRestaurant(res);
    setRoutingPath([]);
    if (res) {
      setMapCenter([res.lat, res.lng]);
    }
  };

  const handleFindShortestPath = (target: Restaurant) => {
    const junctions: Record<string, GraphNode> = {
      iu: { id: 'iu', lat: UI_LOCATION[0], lng: UI_LOCATION[1] },
      gate: { id: 'gate', lat: 10.876, lng: 106.8025 },
      crossroad: { id: 'crossroad', lat: 10.874, lng: 106.8 },
      target: { id: 'target', lat: target.lat, lng: target.lng },
    };

    const graph: Record<string, Edge[]> = {
      iu: [{ to: 'gate', weight: 1 }, { to: 'crossroad', weight: 2 }],
      gate: [{ to: 'iu', weight: 1 }, { to: 'target', weight: 3 }],
      crossroad: [{ to: 'iu', weight: 1 }, { to: 'target', weight: 2 }],
      target: [{ to: 'gate', weight: 3 }, { to: 'crossroad', weight: 2 }],
    };

    const pathIds = dijkstra(graph, 'iu', 'target');
    const pathCoords = pathIds.map((id) => [junctions[id].lat, junctions[id].lng] as [number, number]);
    setRoutingPath(pathCoords);
    setSelectedRestaurant(target);
    setMapCenter([target.lat, target.lng]);
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#f9f9ff]">
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
        <Sidebar
          loading={loading}
          restaurants={filteredRestaurants}
          selectedRestaurant={selectedRestaurant}
          onSelectRestaurant={(res) => handleSelectRestaurant(res)}
        />
        <MapView
          restaurants={filteredRestaurants}
          selectedRestaurant={selectedRestaurant}
          routingPath={routingPath}
          mapCenter={mapCenter}
          onSelectRestaurant={handleSelectRestaurant}
          onFindPath={handleFindShortestPath}
        />
      </div>
    </div>
  );
}
