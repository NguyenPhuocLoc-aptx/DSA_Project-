// src/dsa/Graph.ts
// Adjacency-list weighted undirected graph + Dijkstra with step-by-step traversal support.

import { BinaryHeap } from './Heap';

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
}

export interface GraphEdge {
  to: string;
  weight: number; // distance in km
}

export interface DijkstraStep {
  /** Node being settled (finalized) in this step. */
  settledNodeId: string;
  /** Current shortest distances snapshot at this step. */
  distances: Record<string, number>;
  /** Previous-node map at this step (for path reconstruction). */
  previous: Record<string, string | null>;
}

export interface DijkstraResult {
  /** Ordered list of node IDs forming the shortest path (empty if unreachable). */
  path: string[];
  /** Total distance in km. */
  totalDistanceKm: number;
  /** Step-by-step log for animation/visualization. */
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
    this.adj.get(toId)?.push({ to: fromId, weight }); // undirected
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

  /**
   * Dijkstra's algorithm with full step logging for animation.
   * Uses a min-heap priority queue: O((V + E) log V)
   */
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

    // Min-heap: [distance, nodeId]
    const pq = new BinaryHeap<[number, string]>((a, b) => a[0] - b[0]);
    pq.push([0, startId]);

    while (pq.size > 0) {
      const [dist, u] = pq.pop()!;
      if (settled.has(u)) continue;
      settled.add(u);

      // Record this settlement as a step for the visualizer.
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

    // Reconstruct path.
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

  /**
   * Build a graph from a list of OSM-style nodes.
   * Connects each node to its N spatially nearest neighbours within maxEdgeKm.
   */
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

function haversineKmSimple(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}