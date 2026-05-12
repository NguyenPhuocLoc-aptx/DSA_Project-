import React from 'react';
import { Search, Loader2, Coffee, Utensils, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { type Restaurant } from '../hooks/useRestaurants';

interface SidebarProps {
    loading: boolean;
    restaurants: Restaurant[];
    selectedRestaurant: Restaurant | null;
    onSelectRestaurant: (res: Restaurant) => void;
}

export default function Sidebar({ loading, restaurants, selectedRestaurant, onSelectRestaurant }: SidebarProps) {
    return (
        <aside className="w-80 border-r border-[#c1c6d6] bg-white flex flex-col z-40 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.05)]">
            <div className="p-4 border-b border-[#c1c6d6] bg-[#f0f3ff]/30">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">Xếp hạng theo Rating</h2>
                    <span className="text-[10px] bg-[#005bbf] text-white px-2 py-0.5 rounded-full font-bold">Quick Sort</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-[#727785]">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : restaurants.length > 0 ? (
                    <div className="divide-y divide-[#c1c6d6]/30">
                        {restaurants.map((res, index) => (
                            <motion.button
                                key={res.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => onSelectRestaurant(res)}
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
                    </div>
                )}
            </div>
        </aside>
    );
}