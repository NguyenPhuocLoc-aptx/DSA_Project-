// src/dsa/Graph.ts
import { BinaryHeap } from './Heap';
import { OSMNode, OSMEdge } from '../lib/fetchOSMRoadNetwork';

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
}

export interface GraphEdge {
  to: string;
  weight: number;
}

export interface DijkstraStep {
  settledNodeId: string;
  distances: Record<string, number>;
  previous: Record<string, string | null>;
}

export interface DijkstraResult {
  path: string[];
  totalDistanceKm: number;
  steps: DijkstraStep[];
}

export class Graph {
  private nodes: Map<string, GraphNode> = new Map();
  private adj: Map<string, GraphEdge[]> = new Map();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adj.has(node.id)) this.adj.set(node.id, []);
  }

  addEdge(fromId: string, toId: string, weight: number): void {
    this.adj.get(fromId)?.push({ to: toId, weight });
    this.adj.get(toId)?.push({ to: fromId, weight });
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  getEdges(id: string): GraphEdge[] {
    return this.adj.get(id) ?? [];
  }

  dijkstra(startId: string, endId: string): DijkstraResult {
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const settled = new Set<string>();
    const steps: DijkstraStep[] = [];

    for (const id of this.nodes.keys()) {
      distances[id] = Infinity;
      previous[id] = null;
    }
    distances[startId] = 0;

    const pq = new BinaryHeap<[number, string]>((a, b) => a[0] - b[0]);
    pq.push([0, startId]);

    while (pq.size > 0) {
      const [dist, u] = pq.pop()!;
      if (settled.has(u)) continue;
      settled.add(u);

      steps.push({
        settledNodeId: u,
        distances: { ...distances },
        previous: { ...previous },
      });

      if (u === endId) break;

      for (const edge of this.adj.get(u) ?? []) {
        if (settled.has(edge.to)) continue;
        const alt = dist + edge.weight;
        if (alt < distances[edge.to]) {
          distances[edge.to] = alt;
          previous[edge.to] = u;
          pq.push([alt, edge.to]);
        }
      }
    }

    const path: string[] = [];
    let curr: string | null = endId;
    while (curr !== null) {
      path.unshift(curr);
      curr = previous[curr] ?? null;
    }

    const reachable = path[0] === startId;
    return {
      path: reachable ? path : [],
      totalDistanceKm: reachable ? distances[endId] : Infinity,
      steps,
    };
  }

  // ── Factory: from explicit OSM node/edge lists ──────────────────────────
  static buildFromOSM(nodes: OSMNode[], edges: OSMEdge[]): Graph {
    const g = new Graph();
    for (const n of nodes) g.addNode(n);
    for (const e of edges) g.addEdge(e.from, e.to, e.distanceKm);
    return g;
  }

  // ── Factory: spatial proximity graph (legacy / fallback) ─────────────────
  static buildFromNodes(nodes: GraphNode[], maxEdgeKm = 0.15, maxNeighbours = 6): Graph {
    const g = new Graph();
    for (const n of nodes) g.addNode(n);

    for (let i = 0; i < nodes.length; i++) {
      const candidates: Array<{ j: number; dist: number }> = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dist = haversineKmSimple(nodes[i], nodes[j]);
        if (dist <= maxEdgeKm) candidates.push({ j, dist });
      }
      candidates.sort((a, b) => a.dist - b.dist);
      for (const { j, dist } of candidates.slice(0, maxNeighbours)) {
        g.addEdge(nodes[i].id, nodes[j].id, dist);
      }
    }
    return g;
  }
}

function haversineKmSimple(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}