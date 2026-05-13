// src/lib/snapToGraph.ts
import { KDTree } from '../dsa/KDTree';

export function snapToNearestNode(
  point: { lat: number; lng: number },
  kdTree: KDTree
): string {
  const SNAP_RADIUS_KM = 0.7;
  const results = kdTree.nearestK(
    { id: '_snap', lat: point.lat, lng: point.lng },
    1,
    SNAP_RADIUS_KM
  );
  return results[0]?.point.id ?? '';
}