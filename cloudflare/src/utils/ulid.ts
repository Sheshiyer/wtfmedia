/**
 * Cryptographically secure monotonic ULID generator.
 * Uses Web Crypto API (crypto.getRandomValues) compatible with Cloudflare Workers and Node.js.
 * Implements Crockford's Base32 encoding with monotonic rollover support and typed entity prefixes.
 */

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ENCODING_LEN = ENCODING.length;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

const DECODE_MAP: Readonly<Record<string, number>> = Object.freeze(
  ENCODING.split("").reduce<Record<string, number>>((acc, char, index) => {
    acc[char] = index;
    // Map Crockford lowercase and confusing characters
    acc[char.toLowerCase()] = index;
    return acc;
  }, {
    i: 1, I: 1, l: 1, L: 1, o: 0, O: 0,
  })
);

let lastTime = -1;
const lastRandom = new Uint8Array(10);

function getRandomBytes(len: number): Uint8Array {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return bytes;
}

function incrementRandom(random: Uint8Array): boolean {
  for (let i = random.length - 1; i >= 0; i--) {
    if (random[i] < 255) {
      random[i]++;
      return true;
    }
    random[i] = 0;
  }
  return false; // overflow
}

function encodeTime(now: number, len: number): string {
  let time = now;
  let str = "";
  for (let i = len - 1; i >= 0; i--) {
    const mod = time % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    time = Math.floor(time / ENCODING_LEN);
  }
  return str;
}

function encodeRandom(random: Uint8Array, len: number): string {
  // 80 bits into 16 Base32 characters (each char is 5 bits: 16 * 5 = 80 bits)
  let str = "";
  // 10 bytes = 80 bits. We can read bits 5 at a time.
  let bitBuffer = 0;
  let bitCount = 0;
  let byteIndex = 0;

  for (let i = 0; i < len; i++) {
    while (bitCount < 5 && byteIndex < random.length) {
      bitBuffer = (bitBuffer << 8) | random[byteIndex++];
      bitCount += 8;
    }
    if (bitCount >= 5) {
      const index = (bitBuffer >> (bitCount - 5)) & 31;
      str += ENCODING.charAt(index);
      bitCount -= 5;
    } else {
      const index = (bitBuffer << (5 - bitCount)) & 31;
      str += ENCODING.charAt(index);
      bitCount = 0;
    }
  }
  return str;
}

export type UlidPrefix =
  | "ep_"
  | "ast_"
  | "run_"
  | "txv_"
  | "seg_"
  | "aln_"
  | "chk_"
  | "job_";

/**
 * Generates a 26-character monotonic ULID, optionally prepended with a prefix.
 */
export function ulid(prefix?: string, seedTime?: number): string {
  const now = typeof seedTime === "number" && !isNaN(seedTime) ? Math.floor(seedTime) : Date.now();

  if (now > lastTime) {
    lastTime = now;
    const fresh = getRandomBytes(10);
    lastRandom.set(fresh);
  } else {
    // Same millisecond or slight clock jitter backwards -> monotonic increment
    const success = incrementRandom(lastRandom);
    if (!success) {
      // If 80-bit random buffer overflowed, re-seed with fresh randoms
      const fresh = getRandomBytes(10);
      lastRandom.set(fresh);
    }
  }

  const timePart = encodeTime(now, TIME_LEN);
  const randomPart = encodeRandom(lastRandom, RANDOM_LEN);
  const rawUlid = timePart + randomPart;

  return prefix ? `${prefix}${rawUlid}` : rawUlid;
}

export const generateUlid = ulid;

export function episodeUlid(): string {
  return ulid("ep_");
}

export function assetUlid(): string {
  return ulid("ast_");
}

export function runUlid(): string {
  return ulid("run_");
}

export function transcriptVersionUlid(): string {
  return ulid("txv_");
}

export function segmentUlid(): string {
  return ulid("seg_");
}

export function alignmentUlid(): string {
  return ulid("aln_");
}

export function chunkUlid(): string {
  return ulid("chk_");
}

export function jobUlid(): string {
  return ulid("job_");
}

/**
 * Validates whether a given string is a valid ULID, optionally matching a specific prefix.
 */
export function isValidUlid(id: unknown, prefix?: string): id is string {
  if (typeof id !== "string") return false;
  let target = id;
  if (prefix) {
    if (!target.startsWith(prefix)) return false;
    target = target.slice(prefix.length);
  }
  if (target.length !== 26) return false;
  for (let i = 0; i < target.length; i++) {
    if (DECODE_MAP[target[i]] === undefined) return false;
  }
  return true;
}

/**
 * Decodes the Unix timestamp (in milliseconds) from a ULID.
 */
export function decodeUlidTime(id: string, prefix?: string): number {
  let target = id;
  if (prefix) {
    if (!target.startsWith(prefix)) {
      throw new Error(`Invalid prefix, expected '${prefix}'`);
    }
    target = target.slice(prefix.length);
  }
  if (target.length < TIME_LEN) {
    throw new Error("ULID string too short");
  }
  let time = 0;
  for (let i = 0; i < TIME_LEN; i++) {
    const val = DECODE_MAP[target[i]];
    if (val === undefined) {
      throw new Error(`Invalid ULID character: ${target[i]}`);
    }
    time = time * ENCODING_LEN + val;
  }
  return time;
}
