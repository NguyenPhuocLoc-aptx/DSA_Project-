// src/dsa/KDTree.ts
// 2D KD-Tree for spatial nearest-neighbor search on lat/lng coordinates.

export interface KDPoint {
  id: string;
  lat: number;
  lng: number;
  [key: string]: unknown;
}

interface KDNode {
  point: KDPoint;
  left: KDNode | null;
  right: KDNode | null;
}

/** Haversine distance in kilometers between two lat/lng points. */
export function haversineKm(a: KDPoint, b: KDPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const chord =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

export class KDTree {
  private root: KDNode | null = null;

  constructor(points: KDPoint[]) {
    this.root = this.build([...points], 0);
  }

  private build(points: KDPoint[], depth: number): KDNode | null {
    if (points.length === 0) return null;
    const axis = depth % 2 === 0 ? 'lat' : 'lng';
    points.sort((a, b) => a[axis] as number - (b[axis] as number));
    const mid = Math.floor(points.length / 2);
    return {
      point: points[mid],
      left: this.build(points.slice(0, mid), depth + 1),
      right: this.build(points.slice(mid + 1), depth + 1),
    };
  }

  /**
   * Find up to K nearest points within maxRadiusKm.
   * Returns results sorted by ascending distance.
   */
  nearestK(
    query: KDPoint,
    k: number,
    maxRadiusKm: number
  ): Array<{ point: KDPoint; distanceKm: number }> {
    // Max-heap simulation using a sorted array (bounded to k elements).
    const heap: Array<{ point: KDPoint; distanceKm: number }> = [];

    const search = (node: KDNode | null, depth: number): void => {
      if (!node) return;

      const dist = haversineKm(query, node.point);
      if (dist <= maxRadiusKm) {
        if (heap.length < k || dist < heap[0].distanceKm) {
          heap.push({ point: node.point, distanceKm: dist });
          // Keep heap sorted descending so index 0 is the worst candidate.
          heap.sort((a, b) => b.distanceKm - a.distanceKm);
          if (heap.length > k) heap.shift();
        }
      }

      const axis = depth % 2 === 0 ? 'lat' : 'lng';
      const diff = (query[axis] as number) - (node.point[axis] as number);
      const [near, far] = diff <= 0 ? [node.left, node.right] : [node.right, node.left];

      search(near, depth + 1);

      // Prune far branch: only explore if the splitting plane is within maxRadius.
      const planeDist = Math.abs(diff) * (axis === 'lat' ? 111 : 111 * Math.cos((query.lat * Math.PI) / 180));
      const worstAccepted = heap.length < k ? maxRadiusKm : Math.min(heap[0].distanceKm, maxRadiusKm);
      if (planeDist <= worstAccepted) {
        search(far, depth + 1);
      }
    };

    search(this.root, 0);
    return heap.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}