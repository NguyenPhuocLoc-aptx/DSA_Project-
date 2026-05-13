// src/components/Sidebar.tsx
import React, { useState } from 'react';
import { Search, Loader2, Coffee, Utensils, Star, ArrowLeft, MapPin, Navigation2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type Restaurant } from '../hooks/useRestaurants';
import { type NearestResult } from './NearestPanel';
import { type SidebarMode } from '../App';

interface SidebarProps {
    loading: boolean;
    restaurants: Restaurant[];        // top-rated list
    nearestSpots: NearestResult[];    // KD-Tree results
    selectedRestaurant: Restaurant | null;
    mode: SidebarMode;
    onSelectRestaurant: (res: Restaurant) => void;
    onNavigate: (res: Restaurant) => void;
    onBackToTopRated: () => void;
}

export default function Sidebar({
    loading,
    restaurants,
    nearestSpots,
    selectedRestaurant,
    mode,
    onSelectRestaurant,
    onNavigate,
    onBackToTopRated,
}: SidebarProps) {
    const [showGuide, setShowGuide] = useState(true);

    return (
        <aside className="w-80 border-r border-[#c1c6d6] bg-white flex flex-col z-40 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* ── Header ───────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {mode === 'top-rated' ? (
                    <motion.div
                        key="header-top"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 border-b border-[#c1c6d6] bg-[#f0f3ff]/30 shrink-0"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
                                Top Rated
                            </h2>
                            <span className="text-[10px] bg-[#005bbf] text-white px-2 py-0.5 rounded-full font-bold">
                                Min-Heap · K=15
                            </span>
                        </div>
                        <p className="text-[10px] text-[#727785] mt-1">
                            Click the map to find spots nearby
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="header-nearest"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 border-b border-[#c1c6d6] bg-[#f0f3ff]/30 shrink-0"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                onClick={onBackToTopRated}
                                className="flex items-center gap-1.5 text-[#005bbf] hover:text-[#1a73e8] transition-colors text-xs font-bold"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back to Top Rated
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
                                Nearest Spots
                            </h2>
                            <span className="text-[10px] bg-[#944a00] text-white px-2 py-0.5 rounded-full font-bold">
                                KD-Tree · K=5
                            </span>
                        </div>
                        <p className="text-[10px] text-[#727785] mt-1">
                            {nearestSpots.length} spots within 2 km
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Content ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto hide-scrollbar relative">
                <AnimatePresence mode="wait">
                    {mode === 'top-rated' ? (
                        <motion.div
                            key="list-top"
                            initial={{ opacity: 0, x: -24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.22 }}
                        >
                            <AnimatePresence>
                                {showGuide && (
                                    <motion.div
                                        key="how-to"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="m-4 p-4 rounded-2xl border border-[#c1c6d6]/60 bg-gradient-to-br from-[#f7f8ff] via-white to-[#edf3ff] shadow-[0_12px_28px_rgba(0,0,0,0.08)]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-bold text-[#111c2d] uppercase tracking-wider">How to use this map</p>
                                                <p className="text-[10px] text-[#727785] mt-1">Quick tour of the data structures</p>
                                            </div>
                                            <button
                                                onClick={() => setShowGuide(false)}
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-[#727785] hover:text-[#111c2d] hover:bg-white/60 transition"
                                                aria-label="Dismiss guide"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="mt-3 grid gap-2 text-[11px] text-[#111c2d]">
                                            <div className="flex items-center gap-2">
                                                <span>🔍</span>
                                                <span>Search instantly (Prefix Trie)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>🏆</span>
                                                <span>Top rated spots (Min/Max Heap)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>📍</span>
                                                <span>Click map for nearby food (KD-Tree)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>🗺️</span>
                                                <span>Get directions to see the shortest path (Dijkstra)</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-3 text-[#727785]">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p className="text-xs">Loading restaurants…</p>
                                </div>
                            ) : restaurants.length > 0 ? (
                                <div className="divide-y divide-[#c1c6d6]/30">
                                    {restaurants.map((res, index) => (
                                        <motion.button
                                            key={res.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.035, duration: 0.25 }}
                                            onClick={() => onSelectRestaurant(res)}
                                            className={`w-full p-4 text-left hover:bg-[#f0f3ff] transition-all flex gap-4 ${selectedRestaurant?.id === res.id
                                                ? 'bg-[#1a73e8]/5 border-l-4 border-[#005bbf]'
                                                : ''
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-[#dee8ff] flex items-center justify-center shrink-0">
                                                {res.type === 'cafe' ? (
                                                    <Coffee className="w-5 h-5 text-[#944a00]" />
                                                ) : (
                                                    <Utensils className="w-5 h-5 text-[#005bbf]" />
                                                )}
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
                                    <p className="text-xs">No restaurants found</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list-nearest"
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 24 }}
                            transition={{ duration: 0.22 }}
                        >
                            {nearestSpots.length === 0 ? (
                                <div className="p-8 text-center text-[#727785]">
                                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">No spots found nearby</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#c1c6d6]/30">
                                    {nearestSpots.map((item, i) => (
                                        <motion.div
                                            key={item.restaurant.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05, duration: 0.25 }}
                                            className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-[#f0f3ff] transition-colors ${selectedRestaurant?.id === item.restaurant.id
                                                ? 'bg-blue-50 border-l-4 border-[#005bbf]'
                                                : ''
                                                }`}
                                            onClick={() => onSelectRestaurant(item.restaurant)}
                                        >
                                            {/* Rank badge */}
                                            <div className="w-8 h-8 rounded-xl bg-[#dee8ff] flex items-center justify-center shrink-0 text-[10px] font-black text-[#005bbf]">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[#111c2d] truncate">
                                                    {item.restaurant.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-[#727785]">
                                                        {(item.distanceKm * 1000).toFixed(0)} m away
                                                    </span>
                                                    <span className="text-[#c1c6d6]">·</span>
                                                    <div className="flex items-center gap-0.5">
                                                        <Star className="w-2.5 h-2.5 fill-[#fdaf0a] text-[#fdaf0a]" />
                                                        <span className="text-[10px] font-bold text-[#805600]">
                                                            {item.restaurant.rating}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                    e.stopPropagation();
                                                    onNavigate(item.restaurant);
                                                }}
                                                title="Get directions"
                                                className="w-7 h-7 rounded-xl bg-[#005bbf] flex items-center justify-center text-white shrink-0 hover:bg-[#1a73e8] transition-colors"
                                            >
                                                <Navigation2 className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </aside>
    );
}