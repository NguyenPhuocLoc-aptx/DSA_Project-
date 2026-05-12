// src/dsa/Trie.ts
// Prefix Trie for O(prefix-length) restaurant name autocomplete.

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  /** Store IDs of all restaurants whose names pass through this node. */
  ids: string[];
}

function createNode(): TrieNode {
  return { children: new Map(), isEnd: false, ids: [] };
}

export class Trie {
  private root: TrieNode = createNode();

  /** Insert a name + its associated restaurant id. Case-insensitive. */
  insert(name: string, id: string): void {
    let node = this.root;
    for (const ch of name.toLowerCase()) {
      if (!node.children.has(ch)) {
        node.children.set(ch, createNode());
      }
      node = node.children.get(ch)!;
      node.ids.push(id);
    }
    node.isEnd = true;
  }

  /**
   * Return all restaurant IDs whose names start with the given prefix.
   * Returns an empty array when prefix not found.
   */
  search(prefix: string): string[] {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch)!;
    }
    // Deduplicate while preserving insertion order.
    return [...new Set(node.ids)];
  }
}