#!/usr/bin/env node

/**
 * Build the public topic-connections artifact from the existing semantic index.
 *
 * The pipeline is intentionally provider-free: it clusters the same passage
 * embeddings used by local RAG, derives labels from cluster-specific phrases,
 * and aligns representative passages to native YouTube caption sidecars. It
 * never estimates a timestamp. Passages that cannot be aligned are omitted.
 *
 * Usage:
 *   node scripts/build-topic-connections.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VECTOR_PATH = path.join(ROOT, "web/src/data/vectors.json");
const TRANSCRIPT_DIR = path.join(ROOT, "web/public/transcripts");
const OUTPUT_PATH = path.join(ROOT, "web/src/data/topic-connections.json");

const CLUSTER_COUNT = 180;
const ITERATIONS = 10;
const MIN_EPISODES = 3;
const MAX_EPISODE_SPREAD = 30;
const MAX_TOPICS = 72;
const MAX_OCCURRENCES = MAX_EPISODE_SPREAD;
const MAX_PHRASE_CANDIDATES = 1500;
const MAX_EDGES_PER_TOPIC = 6;

const STOPWORDS = new Set(`
  a about above actually again against all also am an and any are as at back be
  because been before being below between both but by can could did do does
  doing down during each few for from further get getting give go going good
  got had has have having he her here hers herself him himself his how i if in
  into is it its itself just kind know like lot make many may me might more most
  much must my myself need no nor not now of off on once only or other our ours
  ourselves out over own people really right said same say see she should so
  some something still such take than that the their theirs them themselves then
  there these they thing things think this those through time to too under until
  up us very want was way we well were what when where which while who why will
  with would yeah yes you your yours yourself yourselves mhm uh um okay ok
  podcast episode conversation question answer tell told talk talking
  nikhil nik nikil kamath wtf music laughter
`.trim().split(/\s+/));

const NON_TOPIC_TERMS = new Set(`
  india indian bangalore bengaluru mumbai bombay delhi america american europe
  european china chinese russia russian london cyprus country countries city
  cities world global today years year day days person someone everybody united
  states york zealand san francisco silicon valley south africa east asia
  hong kong saudi arabia
`.trim().split(/\s+/));

const GENERIC_LABEL_TERMS = new Set(`
  little bit beat don doesn didn feel feels felt start started starting crying
  clears throat
  ago away came come coming called call hard whole bunch big small really
  sure maybe probably trying try wanted wants look looking seen haven none
  matters every everything someone somebody two three four five million
  billion first second point part stuff work working make making made put
  gets getting went going today tomorrow yesterday ever never always
  guy guys worked used saying after around one fourth carl neil moan
  interesting different super valuable enough attached hands
  friend friends mine certain amount word cloud speak english
  mean
`.trim().split(/\s+/));

const GENERIC_PHRASE_PATTERNS = [
  /^(even though|makes sense|last (week|month|year|decade|couple)|anything else|anyone else|everyone else|nobody else|nothing else)$/,
  /^(let s assume|old boy|great job|long period|six months|couple of times|large extent|hanging fruit|another company)$/,
  /^(certain amount|word cloud|speak english|use case|next decade|old school)$/,
  /^(couple of months|somewhere else|nobody knows|six seven|boy or girl|last night|needs to change|next step)$/,
  /^(makes money|real life)$/,
  /^(brand new|months later|happen next|next week|better quality|able to build|six or seven|use cases)$/,
  /^(keep asking|high quality|anywhere else|anybody else|next level)$/,
  /^(multiple times|funny story|half an hour)$/,
  /^(towards the end|whatever else|able to buy|happened next|entire life|anytime soon)$/,
  /^(\d[\d ]*|\d[\d ]* rupees|billions? of dollars)$/,
];

const CONCEPT_LABEL_RULES = [
  ["Personal Journeys", [/\bfamily (and )?members\b/, /\byoung age\b/]],
  ["Family & Upbringing", [/\bschool (and )?college\b/, /\b(father|mom (and )?dad|family)\b/]],
  ["AI Infrastructure", [/\bdata center\b/, /\b(goods (and )?services|self driving|foundational ai)\b/]],
  ["Identity & Vulnerability", [/\bimposter complex\b/]],
  ["Global Order & Mobility", [/\binternational system\b/, /\bper capita\b/]],
  ["AI & Automation", [/\bsuper intelligence\b/, /\b(robot|write code|neural networks)\b/]],
  ["AI, Agency & Society", [/\bcollective consciousness\b/, /\b(intelligence humans|understand reality)\b/]],
  ["AI Agents", [/\bagents help\b/, /\b(open google|agent sit|voice agents)\b/]],
  ["Political Leadership", [/\bprime minister\b/, /\bpublic service\b/]],
  ["Gaming & Virtual Worlds", [/\b(metaverse|video games)\b/, /\b(play game|counter strike|virtual world)\b/]],
  ["Consumer Brands & Alcohol", [/\bliquor\b/, /\b(alcohol|whiskey|whisky|beverage|breweries)\b/]],
  ["Business Education", [/\bbusiness school\b/, /\b(great learning|father worked)\b/]],
  ["Hospitality Careers", [/\bmanagement training\b/, /\bculinary school\b/]],
];

const CATEGORY_RULES = [
  ["AI & Technology", /\b(ai|artificial|intelligence|technology|software|digital|data|internet|robot|automation|compute|platform)\b/],
  ["Startups & Founders", /\b(founder|startup|entrepreneur|venture|team|building|failure|scale|company|companies)\b/],
  ["Money & Markets", /\b(market|capital|invest|investment|investor|money|wealth|finance|financial|equity|fund|valuation)\b/],
  ["Health & Longevity", /\b(health|body|brain|sleep|exercise|food|disease|medical|medicine|longevity|mental)\b/],
  ["Geopolitics & Society", /\b(government|policy|politic|society|war|democracy|state|public|citizen|education|culture)\b/],
  ["Mind & Philosophy", /\b(mind|meaning|happiness|fear|belief|identity|purpose|conscious|philosophy|relationship|life)\b/],
  ["Media & Culture", /\b(media|creator|content|film|music|story|audience|brand|social|celebrity)\b/],
  ["Science & Climate", /\b(science|energy|climate|environment|physics|space|battery|biology|research)\b/],
  ["Business & Strategy", /\b(business|customer|product|strategy|growth|management|leadership|competition|execution|sales)\b/],
];

const CATEGORY_LABEL_RULES = [
  ["People & Leadership", /\b(elon musk|bill gates|sam altman)\b/i],
  ["Money & Markets", /\b(real estate|venture capital|private equity|risk capital|stock market|interest rates|market cap|investment losses|banking|financial services|per-capita economics)\b/i],
  ["Business & Strategy", /\b(supply chains|building businesses|business model|startup fundraising|product-market fit|family business|aspiring entrepreneurs|large enterprises|market share|skills & careers|market sizing|market opportunities)\b/i],
  ["AI & Technology", /\b(mobile technology|open source|large language models|computer science|data centers|product form factors|electric vehicles|technology companies|emerging technology|platform extensibility|pace of change|human intelligence|common-sense reasoning)\b/i],
  ["Geopolitics & Society", /\b(the middle class|education & schooling|political leadership|business education|childhood & parenting|generational change|generational differences|universal basic income|quality of life|family & class|engineering education|peer influence)\b/i],
  ["Media & Culture", /\b(social media|content creation|creator economy|tiktok|books & authorship|cricket|video games|long-form content)\b/i],
  ["Science & Climate", /\b(climate change|energy transition|electrical engineering)\b/i],
  ["Mind & Philosophy", /\b(long-term thinking|short-term thinking|human nature|family & upbringing|schools of thought|decision-making|personal life)\b/i],
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function words(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function contentWords(text) {
  return words(text).filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function dot(a, b) {
  let value = 0;
  for (let index = 0; index < a.length; index += 1) value += a[index] * b[index];
  return value;
}

function normalize(vector) {
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (let index = 0; index < vector.length; index += 1) vector[index] /= norm;
  return vector;
}

function decodeEmbedding(value, dimension) {
  const buffer = Buffer.from(value, "base64");
  const vector = new Float32Array(dimension);
  for (let index = 0; index < dimension; index += 1) {
    vector[index] = buffer.readFloatLE(index * 4);
  }
  return normalize(vector);
}

function seededIndex(length) {
  let hash = 2166136261;
  for (const char of "wtfmedia-topic-connections-v1") {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function meanVector(items, dimension) {
  const mean = new Float32Array(dimension);
  for (const item of items) {
    for (let index = 0; index < dimension; index += 1) mean[index] += item.vector[index];
  }
  return normalize(mean);
}

function discoverClusters(items, dimension) {
  const centers = [items[seededIndex(items.length)].vector.slice()];
  while (centers.length < CLUSTER_COUNT) {
    let bestIndex = -1;
    let lowestSimilarity = Number.POSITIVE_INFINITY;
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const nearest = Math.max(...centers.map((center) => dot(items[itemIndex].vector, center)));
      if (nearest < lowestSimilarity) {
        lowestSimilarity = nearest;
        bestIndex = itemIndex;
      }
    }
    centers.push(items[bestIndex].vector.slice());
  }

  let assignments = new Int16Array(items.length);
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const buckets = Array.from({ length: centers.length }, () => []);
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      let bestCluster = 0;
      let bestScore = -Infinity;
      for (let clusterIndex = 0; clusterIndex < centers.length; clusterIndex += 1) {
        const score = dot(items[itemIndex].vector, centers[clusterIndex]);
        if (score > bestScore) {
          bestScore = score;
          bestCluster = clusterIndex;
        }
      }
      assignments[itemIndex] = bestCluster;
      buckets[bestCluster].push(items[itemIndex]);
    }
    for (let clusterIndex = 0; clusterIndex < centers.length; clusterIndex += 1) {
      if (buckets[clusterIndex].length > 0) {
        centers[clusterIndex] = meanVector(buckets[clusterIndex], dimension);
      }
    }
  }

  return centers.map((center, clusterIndex) => {
    const members = items.filter((_, itemIndex) => assignments[itemIndex] === clusterIndex);
    return { center, members };
  });
}

function phraseCounts(text) {
  const tokens = words(text);
  const counts = new Map();
  const add = (phrase, weight) => counts.set(phrase, (counts.get(phrase) ?? 0) + weight);
  for (let index = 0; index < tokens.length; index += 1) {
    const one = tokens[index];
    if (one.length > 2 && !STOPWORDS.has(one) && !NON_TOPIC_TERMS.has(one)) add(one, 0.3);
    for (const length of [2, 3]) {
      if (index + length > tokens.length) continue;
      const phraseTokens = tokens.slice(index, index + length);
      const meaningful = phraseTokens.filter((word) =>
        word.length > 2 && !STOPWORDS.has(word) && !NON_TOPIC_TERMS.has(word),
      );
      if (meaningful.length < 2) continue;
      if (STOPWORDS.has(phraseTokens[0]) || STOPWORDS.has(phraseTokens.at(-1))) continue;
      if (meaningful.some((word) => GENERIC_LABEL_TERMS.has(word))) continue;
      add(phraseTokens.join(" "), length === 2 ? 1.35 : 1.8);
    }
  }
  return counts;
}

function rankPhrases(clusters) {
  const perCluster = clusters.map((cluster) => {
    const counts = new Map();
    const episodeSpread = new Map();
    for (const item of cluster.members) {
      for (const [phrase, value] of phraseCounts(item.text)) {
        counts.set(phrase, (counts.get(phrase) ?? 0) + value);
        if (!episodeSpread.has(phrase)) episodeSpread.set(phrase, new Set());
        episodeSpread.get(phrase).add(item.video_id);
      }
    }
    return { counts, episodeSpread };
  });

  const documentFrequency = new Map();
  for (const cluster of perCluster) {
    for (const phrase of cluster.counts.keys()) {
      documentFrequency.set(phrase, (documentFrequency.get(phrase) ?? 0) + 1);
    }
  }

  return perCluster.map(({ counts, episodeSpread }) =>
    [...counts.entries()]
      .map(([phrase, frequency]) => {
        const idf = Math.log((clusters.length + 1) / ((documentFrequency.get(phrase) ?? 0) + 1)) + 0.25;
        const spread = Math.sqrt(episodeSpread.get(phrase)?.size ?? 1);
        const lengthBoost = phrase.split(" ").length === 2 ? 1.3 : phrase.split(" ").length === 3 ? 1.1 : 0.55;
        return {
          phrase,
          spread: episodeSpread.get(phrase)?.size ?? 1,
          score: frequency * idf * spread * lengthBoost,
        };
      })
      .filter(({ phrase }) => phrase.length >= 5 && !/^\d/.test(phrase))
      .sort((a, b) => b.score - a.score),
  );
}

function cleanLabel(phrase) {
  const replacements = new Map([
    ["artificial intelligence", "AI"],
    ["machine learning", "Machine Learning"],
    ["mental health", "Mental Health"],
    ["social media", "Social Media"],
    ["public market", "Public Markets"],
    ["private market", "Private Markets"],
    ["climate change", "Climate Change"],
    ["chat gpt", "ChatGPT"],
    ["tik tok", "TikTok"],
    ["stable coin", "Stablecoins"],
    ["content creator", "Creator Economy"],
    ["content creators", "Creator Economy"],
    ["business grow", "Business Growth"],
    ["mom and dad", "Family & Upbringing"],
    ["hot star", "Streaming & Cinema"],
    ["long term", "Long-Term Thinking"],
    ["self driving cars", "Self-Driving Cars"],
    ["universal basic income", "Universal Basic Income"],
    ["basic income", "Universal Basic Income"],
    ["universal basic", "Universal Basic Income"],
    ["neural network", "Neural Networks"],
    ["neural networks", "Neural Networks"],
    ["stable coins", "Stablecoins"],
    ["interest rates", "Interest Rates"],
    ["prime minister", "Political Leadership"],
    ["business school", "Business Education"],
    ["product market fit", "Product-Market Fit"],
    ["box office", "Cinema & Box Office"],
    ["electric vehicles", "Electric Vehicles"],
    ["green hydrogen", "Green Hydrogen"],
    ["renewable energy", "Renewable Energy"],
    ["supply chain", "Supply Chains"],
    ["public markets", "Public Markets"],
    ["private equity", "Private Equity"],
    ["machine learning", "Machine Learning"],
    ["large language models", "Large Language Models"],
    ["large language", "Large Language Models"],
    ["language models", "Large Language Models"],
    ["open source", "Open Source"],
    ["real estate", "Real Estate"],
    ["mental health", "Mental Health"],
    ["middle class", "The Middle Class"],
    ["value creation", "Value Creation"],
    ["wealth creation", "Wealth Creation"],
    ["product market", "Product-Market Fit"],
    ["mobile phone", "Mobile Technology"],
    ["mobile phones", "Mobile Technology"],
    ["build a business", "Building Businesses"],
    ["raise money", "Startup Fundraising"],
    ["high school", "Education & Schooling"],
    ["skill set", "Skills & Careers"],
    ["human beings", "Human Nature"],
    ["thought process", "Decision-Making"],
    ["young kids", "Childhood & Parenting"],
    ["young kid", "Childhood & Parenting"],
    ["family members", "Family & Upbringing"],
    ["stock markets", "Stock Market"],
    ["market fit", "Product-Market Fit"],
    ["creating content", "Content Creation"],
    ["tech companies", "Technology Companies"],
    ["long run", "Long-Term Thinking"],
    ["short term", "Short-Term Thinking"],
    ["per capita", "Per-Capita Economics"],
    ["form factor", "Product Form Factors"],
    ["rate of change", "Pace of Change"],
    ["school of thought", "Schools of Thought"],
    ["new technology", "Emerging Technology"],
    ["sam alman", "Sam Altman"],
    ["large companies", "Large Enterprises"],
    ["lose money", "Investment Losses"],
    ["play cricket", "Cricket"],
    ["third party", "Third-Party Systems"],
    ["quality of life", "Quality of Life"],
    ["age group", "Generational Differences"],
    ["wrote a book", "Books & Authorship"],
    ["bank account", "Banking"],
    ["next generation", "Generational Change"],
    ["data center", "Data Centers"],
    ["wannabe entrepreneurs", "Aspiring Entrepreneurs"],
    ["build on top", "Platform Extensibility"],
    ["better life", "Quality of Life"],
    ["middle class family", "Family & Class"],
    ["class family", "Family & Class"],
    ["piece of content", "Content Creation"],
    ["playing cricket", "Cricket"],
    ["played cricket", "Cricket"],
    ["cell phone", "Mobile Technology"],
    ["engineering college", "Engineering Education"],
    ["market size", "Market Sizing"],
    ["building a business", "Building Businesses"],
    ["long form", "Long-Form Content"],
    ["huge opportunity", "Market Opportunities"],
    ["large company", "Large Enterprises"],
    ["skill sets", "Skills & Careers"],
    ["peer group", "Peer Influence"],
    ["young age", "Childhood & Parenting"],
    ["common sense", "Common-Sense Reasoning"],
  ]);
  if (replacements.has(phrase)) return replacements.get(phrase);
  return phrase
    .split(" ")
    .slice(0, 4)
    .map((word) => word === "ai" ? "AI" : `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function chooseConceptLabel(cluster, ranked, used) {
  const corpus = ranked.slice(0, 60).map((item) => item.phrase).join(" ").toLowerCase();
  for (const [label, patterns] of CONCEPT_LABEL_RULES) {
    const key = label.toLowerCase();
    if (!used.has(key) && patterns.every((pattern) => pattern.test(corpus))) {
      used.add(key);
      const anchors = ranked
        .filter((candidate) => candidate.spread >= 2 && patterns.some((pattern) => pattern.test(candidate.phrase)))
        .filter((candidate) => new Set(candidate.phrase.split(" ")).size === candidate.phrase.split(" ").length)
        .map((candidate) => candidate.phrase)
        .slice(0, 12);
      return { label, anchors };
    }
  }
  return chooseLabel(ranked, used);
}

function chooseLabel(ranked, used) {
  for (const candidate of ranked.slice(0, 80)) {
    const tokens = candidate.phrase.split(" ");
    if (candidate.spread < MIN_EPISODES || tokens.length < 2) continue;
    if (new Set(tokens).size !== tokens.length) continue;
    if (tokens.some((word) => NON_TOPIC_TERMS.has(word) || GENERIC_LABEL_TERMS.has(word))) continue;
    const label = cleanLabel(candidate.phrase);
    const key = label.toLowerCase();
    if (!used.has(key)) {
      used.add(key);
      return { label, anchors: [candidate.phrase] };
    }
  }
  return null;
}

function inferCategory(text, label = text) {
  for (const [category, pattern] of CATEGORY_LABEL_RULES) {
    if (pattern.test(label)) return category;
  }
  if (/\bfamily\b/i.test(text)) return "Mind & Philosophy";
  let winner = "Ideas & Society";
  let best = 0;
  for (const [category, pattern] of CATEGORY_RULES) {
    const count = [...text.matchAll(new RegExp(pattern.source, "gi"))].length;
    if (count > best) {
      winner = category;
      best = count;
    }
  }
  return winner;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function captionIndex(videoId) {
  const file = path.join(TRANSCRIPT_DIR, `${videoId}.json`);
  if (!fs.existsSync(file)) return null;
  const captions = readJson(file).filter((item) => Number.isFinite(item?.t) && typeof item?.x === "string");
  const tokens = [];
  const tokenCaptions = [];
  captions.forEach((caption, captionIndexValue) => {
    words(caption.x).forEach((token) => {
      if (token === "music" || token === "laughter") return;
      tokens.push(token);
      tokenCaptions.push(captionIndexValue);
    });
  });
  return { captions, tokens, tokenCaptions };
}

function findSequence(haystack, needle, from = 0) {
  if (needle.length === 0) return -1;
  outer: for (let index = Math.max(0, from); index <= haystack.length - needle.length; index += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[index + offset] !== needle[offset]) continue outer;
    }
    return index;
  }
  return -1;
}

function alignPassage(item, cache, focusPhrase) {
  if (!cache.has(item.video_id)) cache.set(item.video_id, captionIndex(item.video_id));
  const index = cache.get(item.video_id);
  if (!index) return null;
  const passageTokens = words(item.text).filter((token) => token !== "music" && token !== "laughter");
  if (passageTokens.length < 12) return null;

  const anchorOffsets = [0, Math.floor(passageTokens.length * 0.12), Math.floor(passageTokens.length * 0.3)];
  let startToken = -1;
  let matchedOffset = 0;
  for (const offset of anchorOffsets) {
    const needle = passageTokens.slice(offset, offset + 7);
    startToken = findSequence(index.tokens, needle);
    if (startToken >= 0) {
      matchedOffset = offset;
      break;
    }
  }
  if (startToken < 0) return null;

  const passageStartToken = Math.max(0, startToken - matchedOffset);
  const tailOffset = Math.max(0, passageTokens.length - 8);
  const tailNeedle = passageTokens.slice(tailOffset, tailOffset + 7);
  const tailToken = findSequence(index.tokens, tailNeedle, startToken);
  if (tailToken < startToken) return null;

  const passageEndToken = Math.min(index.tokens.length - 1, tailToken + tailNeedle.length - 1);
  const focusTokens = words(focusPhrase);
  const focusToken = focusTokens.length > 0
    ? findSequence(index.tokens, focusTokens, passageStartToken)
    : -1;
  const focused = focusToken >= passageStartToken && focusToken <= passageEndToken + 20;
  const evidenceStartToken = focused ? Math.max(passageStartToken, focusToken - 24) : passageStartToken;
  const evidenceEndToken = focused
    ? Math.min(passageEndToken, focusToken + focusTokens.length + 48)
    : passageEndToken;

  const startCaption = index.tokenCaptions[evidenceStartToken] ?? index.tokenCaptions[startToken];
  const endCaption = index.tokenCaptions[evidenceEndToken];
  if (!Number.isInteger(startCaption) || !Number.isInteger(endCaption)) return null;
  const startSec = Math.floor(index.captions[startCaption].t);
  const nextCaption = index.captions[endCaption + 1];
  const endSec = Math.max(startSec + 1, Math.ceil(nextCaption?.t ?? (index.captions[endCaption].t + 4)));
  const focusedExcerpt = index.captions
    .slice(startCaption, endCaption + 1)
    .map((caption) => caption.x)
    .join(" ");
  return { startSec, endSec, excerpt: excerptAround(focusedExcerpt, focusPhrase), focused };
}

function excerpt(text, max = 320) {
  const clean = String(text).replace(/\s+/g, " ").replace(/>>/g, "").trim();
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max);
  return `${clipped.slice(0, Math.max(clipped.lastIndexOf(" "), max - 40)).trim()}…`;
}

function excerptAround(text, focusPhrase, max = 320) {
  const clean = String(text).replace(/\s+/g, " ").replace(/>>/g, "").trim();
  if (clean.length <= max) return clean;
  const focusIndex = clean.toLowerCase().indexOf(focusPhrase.toLowerCase());
  if (focusIndex < 0) return excerpt(clean, max);
  const idealStart = Math.max(0, focusIndex - Math.floor(max * 0.38));
  const maxStart = Math.max(0, clean.length - max);
  let start = Math.min(idealStart, maxStart);
  let end = Math.min(clean.length, start + max);
  if (start > 0) {
    const nextSpace = clean.indexOf(" ", start);
    if (nextSpace > start && nextSpace < focusIndex) start = nextSpace + 1;
  }
  if (end < clean.length) {
    const previousSpace = clean.lastIndexOf(" ", end);
    if (previousSpace > focusIndex + focusPhrase.length) end = previousSpace;
  }
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`;
}

function focusPhraseForItem(label, item, anchors) {
  const normalizedText = words(item.text).join(" ");
  const candidate = anchors.find((phrase) => normalizedText.includes(phrase));
  return candidate ?? null;
}

function formatRelation(label, category, score, focusPhrase) {
  const detail = focusPhrase && focusPhrase !== words(label).join(" ")
    ? cleanLabel(focusPhrase)
    : null;
  const lane = category.toLowerCase().replace(" & ", " and ");
  return detail
    ? `A ${lane} perspective connecting ${label} with ${detail}; grouped by semantic similarity (${score.toFixed(2)}).`
    : `A ${lane} perspective on ${label}, grouped by semantic similarity (${score.toFixed(2)}).`;
}

function confidenceLabel(score) {
  if (score >= 0.62) return "high";
  if (score >= 0.5) return "medium";
  return "exploratory";
}

function isGenericPhrase(phrase) {
  return GENERIC_PHRASE_PATTERNS.some((pattern) => pattern.test(phrase));
}

function globalPhraseCandidates(items) {
  const stats = new Map();
  for (const item of items) {
    for (const [phrase, frequency] of phraseCounts(item.text)) {
      const tokens = phrase.split(" ");
      if (tokens.length < 2 || new Set(tokens).size !== tokens.length) continue;
      if (tokens.some((word) => NON_TOPIC_TERMS.has(word) || GENERIC_LABEL_TERMS.has(word))) continue;
      if (isGenericPhrase(phrase)) continue;
      if (!stats.has(phrase)) stats.set(phrase, { phrase, frequency: 0, items: [], episodes: new Set() });
      const stat = stats.get(phrase);
      stat.frequency += frequency;
      stat.items.push(item);
      stat.episodes.add(item.video_id);
    }
  }
  return [...stats.values()]
    .filter((stat) => stat.episodes.size >= MIN_EPISODES && stat.episodes.size <= MAX_EPISODE_SPREAD)
    .map((stat) => ({
      ...stat,
      score: stat.episodes.size * Math.log1p(stat.frequency) * (stat.phrase.split(" ").length === 3 ? 1.18 : 1),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PHRASE_CANDIDATES);
}

function discoverPhraseTopics(items, captionCache) {
  const candidates = globalPhraseCandidates(items);
  const topics = [];
  const usedIds = new Set();
  for (const candidate of candidates) {
    const label = cleanLabel(candidate.phrase);
    const id = slugify(label);
    if (!id || usedIds.has(id)) continue;

    const center = meanVector(candidate.items, candidate.items[0].vector.length);
    const bestByEpisode = new Map();
    for (const item of candidate.items) {
      const score = dot(item.vector, center);
      if (!bestByEpisode.has(item.video_id) || score > bestByEpisode.get(item.video_id).score) {
        bestByEpisode.set(item.video_id, { item, score });
      }
    }
    const category = inferCategory(`${label} ${candidate.items.slice(0, 8).map((item) => item.text).join(" ")}`, label);
    const occurrences = [...bestByEpisode.values()]
      .sort((a, b) => b.score - a.score)
      .map(({ item, score }) => {
        const timing = alignPassage(item, captionCache, candidate.phrase);
        if (!timing?.focused) return null;
        return {
          episodeId: item.video_id,
          title: item.title,
          startSec: timing.startSec,
          endSec: timing.endSec,
          excerpt: timing.excerpt,
          connection: formatRelation(label, category, score, candidate.phrase),
          relevance: Math.round(score * 1000) / 1000,
          url: `https://www.youtube.com/watch?v=${item.video_id}&t=${timing.startSec}s`,
        };
      })
      .filter(Boolean);
    if (occurrences.length < MIN_EPISODES) continue;

    const averageRelevance = occurrences.reduce((sum, item) => sum + item.relevance, 0) / occurrences.length;
    usedIds.add(id);
    topics.push({
      id,
      label,
      category,
      summary: `A recurring transcript theme with an exact caption-aligned location in each of ${occurrences.length} connected episodes.`,
      episodeCount: occurrences.length,
      occurrenceCount: occurrences.length,
      anchorPhrases: [candidate.phrase],
      confidence: confidenceLabel(averageRelevance),
      confidenceScore: Math.round(averageRelevance * 1000) / 1000,
      relatedPhrases: [],
      occurrences,
    });
  }
  return topics;
}

function main() {
  const store = readJson(VECTOR_PATH);
  if (!Array.isArray(store.items) || !Number.isInteger(store.dim) || store.items.length === 0) {
    throw new Error("The local semantic index is unavailable or malformed.");
  }

  const items = store.items.map((item) => ({ ...item, vector: decodeEmbedding(item.embedding, store.dim) }));
  const rawClusters = discoverClusters(items, store.dim)
    .filter((cluster) => {
      const episodeSpread = new Set(cluster.members.map((item) => item.video_id)).size;
      return episodeSpread >= MIN_EPISODES && episodeSpread <= MAX_EPISODE_SPREAD;
    });
  const rankedByCluster = rankPhrases(rawClusters);
  const usedLabels = new Set();
  const captionCache = new Map();

  const topics = rawClusters.map((cluster, clusterIndex) => {
    const ranked = rankedByCluster[clusterIndex];
    const labelResult = chooseConceptLabel(cluster, ranked, usedLabels);
    if (!labelResult) return null;
    const { label, anchors } = labelResult;
    if (anchors.length === 0) return null;
    const category = inferCategory(`${label} ${ranked.slice(0, 20).map((item) => item.phrase).join(" ")}`, label);

    const candidates = cluster.members
      .map((item) => ({ item, score: dot(item.vector, cluster.center) }))
      .sort((a, b) => b.score - a.score);
    const minimumEvidenceScore = Math.max(0.68, (candidates[0]?.score ?? 0) - 0.15);
    const selectedEpisodes = new Set();
    const occurrences = [];
    for (const candidate of candidates) {
      if (candidate.score < minimumEvidenceScore) continue;
      if (selectedEpisodes.has(candidate.item.video_id)) continue;
      const focusPhrase = focusPhraseForItem(label, candidate.item, anchors);
      if (!focusPhrase) continue;
      const timing = alignPassage(candidate.item, captionCache, focusPhrase);
      if (!timing?.focused) continue;
      selectedEpisodes.add(candidate.item.video_id);
      occurrences.push({
        episodeId: candidate.item.video_id,
        title: candidate.item.title,
        startSec: timing.startSec,
        endSec: timing.endSec,
        excerpt: timing.excerpt,
        connection: formatRelation(label, category, candidate.score, focusPhrase),
        relevance: Math.round(candidate.score * 1000) / 1000,
        url: `https://www.youtube.com/watch?v=${candidate.item.video_id}&t=${timing.startSec}s`,
      });
      if (occurrences.length >= MAX_OCCURRENCES) break;
    }
    if (occurrences.length < MIN_EPISODES) return null;

    const episodeCount = occurrences.length;

    const relatedPhrases = ranked
      .filter((candidate) => candidate.spread >= 2)
      .map((candidate) => cleanLabel(candidate.phrase))
      .filter((phrase) => phrase.toLowerCase() !== label.toLowerCase())
      .filter((phrase) => {
        const tokens = phrase.toLowerCase().split(" ");
        return new Set(tokens).size === tokens.length &&
          !tokens.some((word) => NON_TOPIC_TERMS.has(word) || GENERIC_LABEL_TERMS.has(word));
      })
      .filter((phrase, index, values) => values.indexOf(phrase) === index)
      .slice(0, 3);
    const averageRelevance = occurrences.reduce((sum, item) => sum + item.relevance, 0) / occurrences.length;
    return {
      id: slugify(label),
      label,
      category,
      summary: relatedPhrases.length > 0
        ? `Across ${episodeCount} caption-aligned episodes, this theme connects discussion of ${relatedPhrases.join(", ")}.`
        : `A recurring theme grounded in exact transcript passages from ${episodeCount} episodes.`,
      episodeCount,
      occurrenceCount: occurrences.length,
      anchorPhrases: anchors,
      confidence: confidenceLabel(averageRelevance),
      confidenceScore: Math.round(averageRelevance * 1000) / 1000,
      relatedPhrases,
      occurrences,
    };
  }).filter(Boolean);

  const phraseTopics = discoverPhraseTopics(items, captionCache);
  topics.push(...phraseTopics);
  topics.sort((a, b) => b.episodeCount - a.episodeCount || b.confidenceScore - a.confidenceScore);
  const dedupedTopics = [];
  const seenTopicIds = new Set();
  for (const topic of topics) {
    if (seenTopicIds.has(topic.id)) continue;
    seenTopicIds.add(topic.id);
    dedupedTopics.push(topic);
  }
  const selectedTopics = dedupedTopics.slice(0, MAX_TOPICS);
  const topicById = new Map(selectedTopics.map((topic) => [topic.id, topic]));
  const edgeCandidates = [];
  for (let left = 0; left < selectedTopics.length; left += 1) {
    const leftEpisodes = new Set(selectedTopics[left].occurrences.map((item) => item.episodeId));
    for (let right = left + 1; right < selectedTopics.length; right += 1) {
      const sharedEpisodeIds = selectedTopics[right].occurrences
        .map((item) => item.episodeId)
        .filter((episodeId) => leftEpisodes.has(episodeId));
      const overlapStrength = sharedEpisodeIds.length / Math.min(leftEpisodes.size, selectedTopics[right].occurrences.length);
      if (sharedEpisodeIds.length >= 2 && overlapStrength >= 0.3) {
        edgeCandidates.push({
          source: selectedTopics[left].id,
          target: selectedTopics[right].id,
          sharedEpisodeCount: sharedEpisodeIds.length,
          sharedEpisodeIds,
          overlapStrength,
        });
      }
    }
  }
  edgeCandidates.sort((a, b) => b.overlapStrength - a.overlapStrength || b.sharedEpisodeCount - a.sharedEpisodeCount);
  const degree = new Map();
  const edges = [];
  for (const candidate of edgeCandidates) {
    const sourceDegree = degree.get(candidate.source) ?? 0;
    const targetDegree = degree.get(candidate.target) ?? 0;
    if (sourceDegree >= MAX_EDGES_PER_TOPIC || targetDegree >= MAX_EDGES_PER_TOPIC) continue;
    const { overlapStrength: _overlapStrength, ...edge } = candidate;
    edges.push(edge);
    degree.set(candidate.source, sourceDegree + 1);
    degree.set(candidate.target, targetDegree + 1);
  }

  const sourceEpisodeIds = new Set(store.items.map((item) => item.video_id));
  const artifact = {
    schemaVersion: "topic-connections.v1",
    generatedAt: new Date().toISOString(),
    source: {
      embeddingModel: store.model,
      transcriptMode: "published",
      episodeCount: sourceEpisodeIds.size,
      passageCount: store.items.length,
      timestampPolicy: "native-caption-alignment-only",
    },
    topics: selectedTopics,
    edges,
  };

  for (const edge of artifact.edges) {
    if (!topicById.has(edge.source) || !topicById.has(edge.target)) {
      throw new Error("Generated an edge with a missing topic endpoint.");
    }
  }
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  console.error(
    `[topic-connections] wrote ${path.relative(ROOT, OUTPUT_PATH)}: ${artifact.topics.length} topics, ` +
    `${artifact.edges.length} edges, ${artifact.topics.reduce((sum, topic) => sum + topic.occurrences.length, 0)} timed occurrences`,
  );
}

main();
