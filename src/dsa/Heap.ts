// src/dsa/Heap.ts
// Generic binary heap supporting both min-heap and max-heap modes.
// Used for Top-K restaurant extraction by rating.

type Comparator<T> = (a: T, b: T) => number;

export class BinaryHeap<T> {
  private data: T[] = [];
  private readonly cmp: Comparator<T>;

  /**
   * @param comparator - Return negative if `a` should be closer to the top than `b`.
   *   For a MIN-heap on numbers: (a, b) => a - b
   *   For a MAX-heap on numbers: (a, b) => b - a
   */
  constructor(comparator: Comparator<T>) {
    this.cmp = comparator;
  }

  get size(): number {
    return this.data.length;
  }

  peek(): T | undefined {
    return this.data[0];
  }

  push(value: T): void {
    this.data.push(value);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.cmp(this.data[i], this.data[parent]) < 0) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let best = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.cmp(this.data[l], this.data[best]) < 0) best = l;
      if (r < n && this.cmp(this.data[r], this.data[best]) < 0) best = r;
      if (best === i) break;
      [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
      i = best;
    }
  }
}

export interface Rateable {
  id: string;
  rating: number;
  [key: string]: unknown;
}

/**
 * Extract the top-K items by highest rating using a min-heap of size K.
 * Time: O(n log k)  Space: O(k)
 */
export function topKByRating<T extends Rateable>(items: T[], k: number): T[] {
  // Min-heap keeps the K largest seen so far; root = smallest of the K bests.
  const heap = new BinaryHeap<T>((a, b) => a.rating - b.rating);
  for (const item of items) {
    if (heap.size < k) {
      heap.push(item);
    } else if (heap.peek() && item.rating > heap.peek()!.rating) {
      heap.pop();
      heap.push(item);
    }
  }
  const result: T[] = [];
  while (heap.size > 0) {
    result.unshift(heap.pop()!); // unshift to get descending order
  }
  return result;
}