// src/App.tsx
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { UserCircle, Utensils } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import { type NearestResult } from './components/NearestPanel';
import { topKByRating } from './dsa/Heap';
import { Graph, type GraphNode, type DijkstraResult } from './dsa/Graph';
import { UI_LOCATION, useRestaurants, type Restaurant } from './hooks/useRestaurants';

export type SidebarMode = 'top-rated' | 'nearest';

const ANIMATION_DURATION_MS = 2200;

export default function App() {
  const { restaurants, loading, trie, kdTree } = useRestaurants();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [routingPath, setRoutingPath] = useState<[number, number][]>([]);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [nearestSpots, setNearestSpots] = useState<NearestResult[]>([]);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('top-rated');

  const [dijkstraResult, setDijkstraResult] = useState<DijkstraResult | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [exploredEdges, setExploredEdges] = useState<[[number, number], [number, number]][]>([]);
  const exploredBufferRef = useRef<[[number, number], [number, number]][]>([]);

  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);

  const topRestaurants = useMemo(() => topKByRating(restaurants, 15), [restaurants]);

  const cityGraph = useMemo(() => {
    const iuNode: GraphNode = { id: 'iu', lat: UI_LOCATION[0], lng: UI_LOCATION[1] };
    return Graph.buildFromNodes([iuNode, ...restaurants]);
  }, [restaurants]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastFrameRef.current = 0;
  }, []);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  const runDijkstraAnimation = useCallback((result: DijkstraResult) => {
    stopAnimation();
    setIsAnimating(true);
    setRoutingPath([]);
    setExploredEdges([]);
    exploredBufferRef.current = [];
    setCurrentStepIndex(0);

    const steps = result.steps;
    if (steps.length === 0) {
      setIsAnimating(false);
      return;
    }

    const msPerStep = Math.min(60, Math.max(8, ANIMATION_DURATION_MS / steps.length));
    let stepIndex = 0;

    const tick = (timestamp: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const elapsed = timestamp - lastFrameRef.current;
      const stepsThisFrame = Math.max(1, Math.floor(elapsed / msPerStep));

      for (let i = 0; i < stepsThisFrame && stepIndex < steps.length; i++) {
        const step = steps[stepIndex];
        const currNode = cityGraph.getNode(step.settledNodeId);
        const prevId = step.previous[step.settledNodeId];
        const prevNode = prevId ? cityGraph.getNode(prevId) : null;
        if (currNode && prevNode) {
          const edge: [[number, number], [number, number]] = [
            [prevNode.lat, prevNode.lng],
            [currNode.lat, currNode.lng],
          ];
          exploredBufferRef.current = [...exploredBufferRef.current, edge];
        }
        stepIndex++;
      }

      setExploredEdges([...exploredBufferRef.current]);
      setCurrentStepIndex(stepIndex);
      lastFrameRef.current = timestamp;

      if (stepIndex >= steps.length) {
        stopAnimation();
        setIsAnimating(false);
        setCurrentStepIndex(steps.length);

        const pathCoords = result.path
          .map((id) => cityGraph.getNode(id))
          .filter((n): n is GraphNode => Boolean(n))
          .map((n) => [n.lat, n.lng] as [number, number]);

        setRoutingPath(pathCoords);
        setTimeout(() => {
          setExploredEdges([]);
          exploredBufferRef.current = [];
        }, 500);
        return;
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
  }, [cityGraph, stopAnimation]);

  const handleSelectRestaurant = useCallback((res: Restaurant | null) => {
    stopAnimation();
    setSelectedRestaurant(res);
    setRoutingPath([]);
    setDijkstraResult(null);
    setExploredEdges([]);
    exploredBufferRef.current = [];
    setCurrentStepIndex(0);
    setIsAnimating(false);
    if (res) setFlyTarget({ center: [res.lat, res.lng], zoom: 18 });
  }, [stopAnimation]);

  const handleFindShortestPath = useCallback((target: Restaurant) => {
    stopAnimation();
    setRoutingPath([]);
    setExploredEdges([]);
    exploredBufferRef.current = [];
    setCurrentStepIndex(0);
    setIsAnimating(false);

    const result = cityGraph.dijkstra('iu', target.id);
    setDijkstraResult(result);
    setSelectedRestaurant(target);
    setFlyTarget({ center: [target.lat, target.lng], zoom: 17 });
    runDijkstraAnimation(result);
  }, [cityGraph, stopAnimation, runDijkstraAnimation]);

  const handleStartAnimation = useCallback(() => {
    if (!dijkstraResult) return;
    runDijkstraAnimation(dijkstraResult);
  }, [dijkstraResult, runDijkstraAnimation]);

  const handleResetRoute = useCallback(() => {
    stopAnimation();
    setRoutingPath([]);
    setExploredEdges([]);
    exploredBufferRef.current = [];
    setCurrentStepIndex(0);
    setIsAnimating(false);
    setDijkstraResult(null);
  }, [stopAnimation]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!kdTree) return;
    const results = kdTree.nearestK({ id: 'query', lat, lng }, 5, 2.0);
    const mapped = results.map((item) => ({
      restaurant: item.point as Restaurant,
      distanceKm: item.distanceKm,
    }));
    setNearestSpots(mapped);
    if (mapped.length > 0) setSidebarMode('nearest');
  }, [kdTree]);

  const handleBackToTopRated = useCallback(() => {
    setSidebarMode('top-rated');
    setNearestSpots([]);
  }, []);

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
          nearestSpots={nearestSpots}
          selectedRestaurant={selectedRestaurant}
          mode={sidebarMode}
          onSelectRestaurant={handleSelectRestaurant}
          onNavigate={handleFindShortestPath}
          onBackToTopRated={handleBackToTopRated}
        />

        <MapView
          restaurants={restaurants}
          selectedRestaurant={selectedRestaurant}
          routingPath={routingPath}
          exploredEdges={exploredEdges}
          flyTarget={flyTarget}
          onFlyComplete={() => setFlyTarget(null)}
          onSelectRestaurant={handleSelectRestaurant}
          onFindPath={handleFindShortestPath}
          onMapClick={handleMapClick}
          dijkstraResult={dijkstraResult}
          animatingRoute={isAnimating}
          currentStepIndex={currentStepIndex}
          onStartAnimation={handleStartAnimation}
          onResetRoute={handleResetRoute}
        />
      </div>
    </div>
  );
}