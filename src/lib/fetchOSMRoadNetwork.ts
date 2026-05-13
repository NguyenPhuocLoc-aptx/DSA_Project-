// src/lib/fetchOSMRoadNetwork.ts

export interface OSMNode {
  id: string;
  lat: number;
  lng: number;
  [key: string]: unknown; // ← satisfies KDPoint index signature
}

export interface OSMEdge {
  from: string;
  to: string;
  distanceKm: number;
}

export interface OSMRoadNetwork {
  nodes: OSMNode[];
  edges: OSMEdge[];
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function fetchOSMRoadNetwork(
  lat: number,
  lng: number,
  radiusM = 2500
): Promise<OSMRoadNetwork> {
  const query = `
    [out:json][timeout:60];
    (
      way["highway"]["highway"!~"motorway|motorway_link|trunk"]
         (around:${radiusM},${lat},${lng});
    );
    out body;
    >;
    out skel qt;
  `;
  const res = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Overpass OSM error: ${res.status}`);
  const data = await res.json();

  const rawNodes = new Map<string, { lat: number; lng: number }>();
  const ways: { nodeIds: string[] }[] = [];

  for (const el of data.elements) {
    if (el.type === 'node') {
      rawNodes.set(el.id.toString(), { lat: el.lat, lng: el.lon });
    } else if (el.type === 'way' && el.nodes) {
      ways.push({ nodeIds: el.nodes.map(String) });
    }
  }

  const edgeSet = new Set<string>();
  const edges: OSMEdge[] = [];
  const usedNodeIds = new Set<string>();

  for (const way of ways) {
    for (let i = 0; i < way.nodeIds.length - 1; i++) {
      const a = way.nodeIds[i];
      const b = way.nodeIds[i + 1];
      const nodeA = rawNodes.get(a);
      const nodeB = rawNodes.get(b);
      if (!nodeA || !nodeB) continue;

      usedNodeIds.add(a);
      usedNodeIds.add(b);

      const key = [a, b].sort().join('-');
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from: a, to: b, distanceKm: haversineKm(nodeA, nodeB) });
      }
    }
  }

  const nodes: OSMNode[] = [...usedNodeIds].map((id) => ({
    id,
    lat: rawNodes.get(id)!.lat,
    lng: rawNodes.get(id)!.lng,
  }));

  return { nodes, edges };
}

function haversineKm(
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