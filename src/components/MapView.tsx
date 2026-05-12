import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation2, Utensils, Star, X, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UI_LOCATION, type Restaurant } from '../hooks/useRestaurants';

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

interface MapViewProps {
    restaurants: Restaurant[];
    selectedRestaurant: Restaurant | null;
    routingPath: [number, number][];
    mapCenter: [number, number];
    onSelectRestaurant: (res: Restaurant | null) => void;
    onFindPath: (target: Restaurant) => void;
}

export default function MapView({
    restaurants,
    selectedRestaurant,
    routingPath,
    mapCenter,
    onSelectRestaurant,
    onFindPath
}: MapViewProps) {
    return (
        <main className="flex-1 relative z-10">
            <MapContainer center={UI_LOCATION} zoom={16} className="w-full h-full" zoomControl={false}>
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

                {restaurants.map(res => (
                    <Marker
                        key={res.id}
                        position={[res.lat, res.lng]}
                        icon={createMarkerIcon(res.type === 'cafe' ? '#944a00' : '#005bbf')}
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
                                    className="w-full h-9 bg-[#005bbf] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-[#1a73e8] transition-colors shadow-lg"
                                >
                                    <Navigation2 className="w-3 h-3" /> Dijkstra
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

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
                                <button onClick={() => onSelectRestaurant(null)} className="text-[#727785] hover:text-[#111c2d]"><X className="w-5 h-5" /></button>
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
                                    onClick={() => onFindPath(selectedRestaurant)}
                                    className="flex-1 h-11 bg-[#005bbf] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,91,191,0.3)]"
                                >
                                    <Navigation2 className="w-4 h-4" /> Chỉ đường
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