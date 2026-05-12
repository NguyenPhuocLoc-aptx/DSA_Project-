// src/components/RoutePanel.tsx
import React from 'react';
import { Navigation2, Loader2, CheckCircle2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DijkstraResult } from '../dsa/Graph';

interface Props {
  target: string | null;
  result: DijkstraResult | null;
  animating: boolean;
  currentStepIndex: number;
  totalSteps: number;
  onStart: () => void;
  onReset: () => void;
}

export default function RoutePanel({
  target,
  result,
  animating,
  currentStepIndex,
  totalSteps,
  onStart,
  onReset,
}: Props) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#111c2d] uppercase tracking-wider">Dijkstra Pathfinding</h3>
        <span className="text-[10px] bg-[#005bbf] text-white px-2 py-0.5 rounded-full font-bold">Priority Queue</span>
      </div>

      {!target ? (
        <p className="text-xs text-[#727785]">Chọn một quán ăn để tính đường ngắn nhất.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 bg-[#f0f3ff] rounded-xl">
            <MapPin className="w-4 h-4 text-[#005bbf] shrink-0" />
            <p className="text-xs font-medium text-[#111c2d] truncate">{target}</p>
          </div>

          {/* Progress bar */}
          {(animating || result) && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#727785]">
                <span>Bước {currentStepIndex} / {totalSteps}</span>
                {result && !animating && (
                  <span className="text-green-600 font-bold">
                    {result.totalDistanceKm === Infinity
                      ? 'Không có đường'
                      : `${(result.totalDistanceKm * 1000).toFixed(0)} m`}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-[#dee8ff] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#005bbf] rounded-full"
                  animate={{ width: totalSteps > 0 ? `${(currentStepIndex / totalSteps) * 100}%` : '0%' }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}

          <AnimatePresence>
            {result && !animating && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium ${
                  result.path.length > 0
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {result.path.length > 0
                  ? `Tìm thấy đường qua ${result.path.length} điểm`
                  : 'Không tìm được đường đi'}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <button
              onClick={onStart}
              disabled={animating}
              className="flex-1 h-9 bg-[#005bbf] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-[#1a73e8] transition-colors"
            >
              {animating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang chạy…</>
              ) : (
                <><Navigation2 className="w-3.5 h-3.5" /> Bắt đầu</>
              )}
            </button>
            <button
              onClick={onReset}
              className="px-3 h-9 rounded-xl border border-[#c1c6d6] text-xs text-[#414754] hover:bg-[#f0f3ff] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}