// src/components/NearestPanel.tsx
import React from 'react';
import { MapPin, Star, Navigation2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Restaurant } from '../hooks/useRestaurants';

export interface NearestResult {
    restaurant: Restaurant;
    distanceKm: number;
}

interface Props {
    results: NearestResult[];
    onNavigate: (restaurant: Restaurant) => void;
    onSelect: (restaurant: Restaurant) => void;
    selectedId: string | null;
}

export default function NearestPanel({ results, onNavigate, onSelect, selectedId }: Props) {
    if (results.length === 0) {
        return (
            <div className="p-6 text-center text-[#727785]">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Click trên bản đồ để tìm quán gần nhất (KD-Tree)</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-[#c1c6d6]/30">
            <AnimatePresence initial={false}>
                {results.map((item, i) => (
                    <motion.div
                        key={item.restaurant.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ delay: i * 0.04 }}
                        className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-[#f0f3ff] transition-colors ${selectedId === item.restaurant.id ? 'bg-blue-50 border-l-4 border-[#005bbf]' : ''
                            }`}
                        onClick={() => onSelect(item.restaurant)}
                    >
                        <div className="w-8 h-8 rounded-xl bg-[#dee8ff] flex items-center justify-center shrink-0 text-[10px] font-black text-[#005bbf]">
                            {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#111c2d] truncate">{item.restaurant.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-[#727785]">{(item.distanceKm * 1000).toFixed(0)} m</span>
                                <span className="text-[#c1c6d6]">·</span>
                                <div className="flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-[#fdaf0a] text-[#fdaf0a]" />
                                    <span className="text-[10px] font-bold text-[#805600]">{item.restaurant.rating}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            // FIX: Added React.MouseEvent<HTMLButtonElement> to the 'e' parameter
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation();
                                onNavigate(item.restaurant);
                            }}
                            className="w-7 h-7 rounded-xl bg-[#005bbf] flex items-center justify-center text-white shrink-0 hover:bg-[#1a73e8] transition-colors"
                        >
                            <Navigation2 className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}