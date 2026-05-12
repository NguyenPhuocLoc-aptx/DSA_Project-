// src/App.tsx
import { useMemo, useState } from 'react';
import { UserCircle, Utensils } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import NearestPanel, { type NearestResult } from './components/NearestPanel';
import { topKByRating } from './dsa/Heap';
import { Graph, type GraphNode } from './dsa/Graph';
import { UI_LOCATION, useRestaurants, type Restaurant } from './hooks/useRestaurants';

export default function App() {
  const { restaurants, loading, trie, kdTree } = useRestaurants();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [routingPath, setRoutingPath] = useState<[number, number][]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(UI_LOCATION);
  const [nearestSpots, setNearestSpots] = useState<NearestResult[]>([]);

  // PHASE 2: Heap Integration - Get Top 15 rated restaurants in O(N log K) time
  const topRestaurants = useMemo(() => {
    return topKByRating(restaurants, 15);
  }, [restaurants]);

  // PHASE 4: Graph Integration - Build the real city graph, adding IU as a starting node
  const cityGraph = useMemo(() => {
    const iuNode: GraphNode = {
      id: 'iu',
      lat: UI_LOCATION[0],
      lng: UI_LOCATION[1],
    };
    return Graph.buildFromNodes([iuNode, ...restaurants]);
  }, [restaurants]);

  const handleSelectRestaurant = (res: Restaurant | null) => {
    setSelectedRestaurant(res);
    setRoutingPath([]);
    if (res) {
      setMapCenter([res.lat, res.lng]);
    }
  };

  const handleFindShortestPath = (target: Restaurant) => {
    const result = cityGraph.dijkstra('iu', target.id);

    const pathCoords = result.path
      .map((id) => cityGraph.getNode(id))
      .filter((node): node is GraphNode => Boolean(node))
      .map((node) => [node.lat, node.lng] as [number, number]);

    setRoutingPath(pathCoords);
    setSelectedRestaurant(target);
    setMapCenter([target.lat, target.lng]);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!kdTree) {
      setNearestSpots([]);
      return;
    }
    const results = kdTree.nearestK({ id: 'query', lat, lng }, 5, 2.0);
    setNearestSpots(
      results.map((item) => ({
        restaurant: item.point as Restaurant,
        distanceKm: item.distanceKm,
      }))
    );
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
          <SearchBar trie={trie} restaurants={restaurants} onSelect={handleSelectRestaurant} />
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
          restaurants={topRestaurants}
          selectedRestaurant={selectedRestaurant}
          onSelectRestaurant={(res) => handleSelectRestaurant(res)}
        />

        <MapView
          restaurants={restaurants}
          selectedRestaurant={selectedRestaurant}
          routingPath={routingPath}
          mapCenter={mapCenter}
          onSelectRestaurant={handleSelectRestaurant}
          onFindPath={handleFindShortestPath}
          onMapClick={handleMapClick}
        />

        <div className="absolute top-4 left-4 w-[320px] bg-white rounded-2xl border border-[#c1c6d6] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-50 hidden lg:block">
          <div className="px-4 py-3 border-b border-[#c1c6d6] bg-[#f0f3ff]/30">
            <h3 className="text-xs font-bold text-[#111c2d] uppercase tracking-wider">Nearest Spots</h3>
          </div>
          <NearestPanel
            results={nearestSpots}
            onNavigate={handleFindShortestPath}
            onSelect={handleSelectRestaurant}
            selectedId={selectedRestaurant?.id ?? null}
          />
        </div>
      </div>
    </div>
  );
}