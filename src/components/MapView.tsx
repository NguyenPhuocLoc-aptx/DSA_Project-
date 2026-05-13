// src/components/MapView.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
    Circle,
    Popup,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import L, { type Marker as LeafletMarker } from 'leaflet';
import { Navigation2, Utensils, Star, X, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UI_LOCATION, type Restaurant } from '../hooks/useRestaurants';
import RoutePanel from './RoutePanel';
import { type DijkstraResult } from '../dsa/Graph';

// ── Marker icon factory ───────────────────────────────────────────────────────
const createMarkerIcon = (color: string, selected = false) =>
    L.divIcon({
        className: 'custom-div-icon',
        html: `
    <div class="flex flex-col items-center" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.28))">
      <div style="background:${color};padding:${selected ? '10px' : '8px'};border-radius:50%;border:3px solid white;transform:scale(${selected ? 1.25 : 1});transition:transform 0.2s">
        <svg xmlns="http://www.w3.org/2000/svg" width="${selected ? 18 : 14}" height="${selected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
          <path d="M7 2v20"/>
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
        </svg>
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${color};margin-top:-2px"></div>
    </div>`,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -52],
    });

// ── FlyTo controller ──────────────────────────────────────────────────────────
function FlyToController({
    target,
    onComplete,
}: {
    target: { center: [number, number]; zoom: number } | null;
    onComplete: () => void;
}) {
    const map = useMap();
    useEffect(() => {
        if (!target) return;
        map.flyTo(target.center, target.zoom, { animate: true, duration: 0.85 });
        const t = setTimeout(onComplete, 1000);
        return () => clearTimeout(t);
    }, [target, map, onComplete]);
    return null;
}

// ── Auto-open popup ───────────────────────────────────────────────────────────
function AutoOpenPopup({
    selectedId,
    markerRefs,
}: {
    selectedId: string | null;
    markerRefs: React.MutableRefObject<Map<string, LeafletMarker>>;
}) {
    useEffect(() => {
        if (!selectedId) return;
        const t = setTimeout(() => {
            markerRefs.current.get(selectedId)?.openPopup();
        }, 650);
        return () => clearTimeout(t);
    }, [selectedId, markerRefs]);
    return null;
}

// ── Map click handler ─────────────────────────────────────────────────────────
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
    useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
    return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface MapViewProps {
    restaurants: Restaurant[];
    selectedRestaurant: Restaurant | null;
    routingPath: [number, number][];
    exploredNodes: [number, number][];
    flyTarget: { center: [number, number]; zoom: number } | null;
    onFlyComplete: () => void;
    onSelectRestaurant: (res: Restaurant | null) => void;
    onFindPath: (target: Restaurant) => void;
    onMapClick: (lat: number, lng: number) => void;
    dijkstraResult: DijkstraResult | null;
    animatingRoute: boolean;
    currentStepIndex: number;
    onStartAnimation: () => void;
    onResetRoute: () => void;
}

export default function MapView({
    restaurants,
    selectedRestaurant,
    routingPath,
    exploredNodes,
    flyTarget,
    onFlyComplete,
    onSelectRestaurant,
    onFindPath,
    onMapClick,
    dijkstraResult,
    animatingRoute,
    currentStepIndex,
    onStartAnimation,
    onResetRoute,
}: MapViewProps) {
    const markerRefs = useRef<Map<string, LeafletMarker>>(new Map());
    const [animatedPath, setAnimatedPath] = useState<[number, number][]>([]);
    const pathAnimationRef = useRef<number | null>(null);

    useEffect(() => {
        if (pathAnimationRef.current !== null) {
            cancelAnimationFrame(pathAnimationRef.current);
            pathAnimationRef.current = null;
        }

        if (routingPath.length === 0) {
            setAnimatedPath([]);
            return;
        }

        let startTime: number | null = null;
        const pointsPerSecond = 140;

        const tick = (timestamp: number) => {
            if (startTime === null) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const nextCount = Math.min(
                routingPath.length,
                Math.max(1, Math.floor((elapsed / 1000) * pointsPerSecond))
            );

            setAnimatedPath(routingPath.slice(0, nextCount));

            if (nextCount < routingPath.length) {
                pathAnimationRef.current = requestAnimationFrame(tick);
            } else {
                pathAnimationRef.current = null;
            }
        };

        setAnimatedPath([routingPath[0]]);
        pathAnimationRef.current = requestAnimationFrame(tick);

        return () => {
            if (pathAnimationRef.current !== null) {
                cancelAnimationFrame(pathAnimationRef.current);
                pathAnimationRef.current = null;
            }
        };
    }, [routingPath]);

    return (
        <main className="flex-1 relative z-10">
            <MapContainer center={UI_LOCATION} zoom={16} className="w-full h-full" zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FlyToController target={flyTarget} onComplete={onFlyComplete} />
                <AutoOpenPopup selectedId={selectedRestaurant?.id ?? null} markerRefs={markerRefs} />
                <MapClickHandler onClick={onMapClick} />

                {/* IU origin */}
                <Marker
                    position={UI_LOCATION}
                    icon={L.divIcon({
                        className: 'iu-marker',
                        html: `<div style="width:40px;height:40px;background:#111;border-radius:50%;border:4px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:900;gap:2px;letter-spacing:-0.5px">
              <span>IU</span>
              <div style="width:7px;height:7px;background:#ef4444;border-radius:50%"></div>
            </div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 20],
                    })}
                >
                    <Popup>Vị trí của bạn: ĐH Quốc Tế</Popup>
                </Marker>

                {/* Direct connection line (Euclidean reference) */}
                {dijkstraResult && selectedRestaurant && (
                    <Polyline
                        positions={[UI_LOCATION, [selectedRestaurant.lat, selectedRestaurant.lng]]}
                        color="#9f1239"
                        weight={2}
                        opacity={0.5}
                        dashArray="4, 8"
                    />
                )}

                {/* Dijkstra explored nodes — faint grey dots */}
                {exploredNodes.map((pos, i) => (
                    <Circle
                        key={`exp-${i}`}
                        center={pos}
                        radius={12}
                        pathOptions={{
                            stroke: false,
                            fillColor: '#cbd5f5',
                            fillOpacity: 0.45,
                        }}
                    />
                ))}

                {/* Final shortest path polyline */}
                {animatedPath.length > 1 && (
                    <Polyline
                        positions={animatedPath}
                        color="#005bbf"
                        weight={5}
                        opacity={0.9}
                        dashArray="8, 12"
                    />
                )}

                {/* Restaurant markers */}
                {restaurants.map((res) => (
                    <Marker
                        key={res.id}
                        position={[res.lat, res.lng]}
                        icon={createMarkerIcon(
                            res.type === 'cafe' ? '#944a00' : '#005bbf',
                            selectedRestaurant?.id === res.id
                        )}
                        ref={(m) => {
                            if (m) markerRefs.current.set(res.id, m);
                            else markerRefs.current.delete(res.id);
                        }}
                        eventHandlers={{ click: () => onSelectRestaurant(res) }}
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
                                    onClick={() => onFindPath(res)}
                                    className="w-full h-9 bg-[#005bbf] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-[#1a73e8] transition-colors"
                                >
                                    <Navigation2 className="w-3 h-3" /> Dijkstra Route
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* ── RoutePanel — slides in when a target is chosen ── */}
            <AnimatePresence>
                {dijkstraResult !== null && (
                    <motion.div
                        key="route-panel"
                        initial={{ x: 340, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 340, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                        className="absolute top-4 right-4 w-[300px] bg-white rounded-2xl border border-[#c1c6d6] shadow-[0_20px_50px_rgba(0,0,0,0.14)] overflow-hidden z-50"
                    >
                        <RoutePanel
                            target={selectedRestaurant?.name ?? null}
                            result={dijkstraResult}
                            animating={animatingRoute}
                            currentStepIndex={currentStepIndex}
                            totalSteps={dijkstraResult.steps.length}
                            onStart={onStartAnimation}
                            onReset={onResetRoute}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Selected restaurant bottom card ── */}
            <AnimatePresence>
                {selectedRestaurant && !dijkstraResult && (
                    <motion.div
                        key="res-card"
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute bottom-8 right-8 left-8 md:left-auto md:w-[400px] p-5 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#c1c6d6] z-40 flex gap-5"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-[#005bbf]/10 flex items-center justify-center shrink-0">
                            <Utensils className="w-10 h-10 text-[#005bbf]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-xl text-[#111c2d] truncate">{selectedRestaurant.name}</h3>
                                <button onClick={() => onSelectRestaurant(null)} className="text-[#727785] hover:text-[#111c2d] ml-2 shrink-0">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold text-[#805600]">{selectedRestaurant.rating}</span>
                                <div className="flex text-[#fdaf0a]">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3 h-3 ${i < Math.floor(selectedRestaurant.rating) ? 'fill-current' : ''}`} />
                                    ))}
                                </div>
                                <span className="text-[10px] text-[#727785] truncate ml-1">{selectedRestaurant.address}</span>
                            </div>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => onFindPath(selectedRestaurant)}
                                    className="flex-1 h-11 bg-[#005bbf] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,91,191,0.3)] hover:bg-[#1a73e8] transition-colors"
                                >
                                    <Navigation2 className="w-4 h-4" /> Get Directions
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
    );
}