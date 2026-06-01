// Server-side vector store: loads the prebuilt embeddings index and does
// cosine top-k retrieval. Embeddings are base64-packed Float32 to keep the
// JSON small. Loaded once per server instance (module-level cache).
import fs from "node:fs";
import path from "node:path";

export type VectorItem = {
  video_id: string;
  title: string;
  chunk_idx: number;
  start?: number; // seconds into the episode
  text: string;
  embedding: string; // base64 Float32
};

export type VectorStore = {
  model: string;
  dim: number;
  count: number;
  items: VectorItem[];
};

export type Hit = {
  video_id: string;
  title: string;
  chunk_idx: number;
  start?: number;
  text: string;
  score: number;
};

let cache: { dim: number; vecs: Float32Array[]; meta: VectorItem[] } | null = null;

function unpack(b64: string, dim: number): Float32Array {
  const buf = Buffer.from(b64, "base64");
  return new Float32Array(buf.buffer, buf.byteOffset, dim);
}

function load() {
  if (cache) return cache;
  const file = path.join(process.cwd(), "src", "data", "vectors.json");
  if (!fs.existsSync(file)) {
    cache = { dim: 0, vecs: [], meta: [] };
    return cache;
  }
  const store = JSON.parse(fs.readFileSync(file, "utf-8")) as VectorStore;
  const vecs = store.items.map((it) => {
    const v = unpack(it.embedding, store.dim);
    // pre-normalize for cosine = dot product
    let norm = 0;
    for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1;
    const out = new Float32Array(v.length);
    for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
    return out;
  });
  cache = { dim: store.dim, vecs, meta: store.items };
  return cache;
}

export function isReady(): boolean {
  return load().meta.length > 0;
}

export function search(queryEmbedding: Float32Array, k = 6): Hit[] {
  const { vecs, meta, dim } = load();
  if (!vecs.length) return [];
  // normalize query
  let qn = 0;
  for (let i = 0; i < queryEmbedding.length; i++) qn += queryEmbedding[i] * queryEmbedding[i];
  qn = Math.sqrt(qn) || 1;
  const q = new Float32Array(dim);
  for (let i = 0; i < dim; i++) q[i] = queryEmbedding[i] / qn;

  const scored = vecs.map((v, idx) => {
    let dot = 0;
    for (let i = 0; i < dim; i++) dot += v[i] * q[i];
    return { idx, score: dot };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(({ idx, score }) => ({
    video_id: meta[idx].video_id,
    title: meta[idx].title,
    chunk_idx: meta[idx].chunk_idx,
    start: meta[idx].start,
    text: meta[idx].text,
    score,
  }));
}
