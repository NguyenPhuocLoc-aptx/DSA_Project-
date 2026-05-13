// src/lib/snapToGraph.ts
import { KDTree } from '../dsa/KDTree';

export function snapToNearestNode(
  point: { lat: number; lng: number },
  kdTree: KDTree
): string {
  const results = kdTree.nearestK(
    { id: '_snap', lat: point.lat, lng: point.lng },
    1,
    0.5
  );
  return results[0]?.point.id ?? '';
}