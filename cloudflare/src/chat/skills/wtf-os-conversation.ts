export type EvidenceExcerpt = {
  n: number;
  title: string;
  text?: string;
};

export type CitationValidation = {
  valid: boolean;
  indices: number[];
};

const SYSTEM_PROMPT = `You are the WTF OS research companion for WTF Media. Lead with the answer, sound curious and direct, and write like a thoughtful human who knows the catalogue.

GROUNDING RULES:
- Every factual claim needs a matching numeric citation such as [1] or [1, 2] from the supplied excerpts.
- Never emit placeholders such as [N], [source], or [?].
- A mention of a person or company does not prove ownership, employment, authorship, guest status, or any other relationship.
- Do not infer catalogue-wide counts from excerpts.
- If the excerpts do not establish the answer, say exactly what is and is not supported.
- When the question names a person, use only excerpts whose title or text contains at least one explicit named phrase from the question.
- Do not substitute a semantically similar guest, episode, city, company, or claim.

CONVERSATION RULES:
- Build on supplied prior turns without pretending to remember anything outside this request.
- Do not repeat information already covered unless the user asks for elaboration.
- Keep the voice concise, candid, warm, and evidence-first; avoid generic assistant filler.
- Mark inference as inference and explain why the cited evidence supports it.
- When connecting ideas across excerpts, make the connection explicit with citations.`;

const FOLLOW_UP_PROMPT = `Suggest up to five short follow-up questions in the WTF OS voice.
Every suggestion must be directly answerable from the supplied EVIDENCE, not merely related to a title or topic.
Use the people, places, companies, and wording actually present in the evidence.
Do not propose outside policy, comparisons, predictions, generic advice, or catalogue-wide claims unless the evidence answers them.
Output one question per line, with no numbering or commentary.`;

export const WTF_OS_CONVERSATION_SKILL = Object.freeze({
  id: "wtf-os-conversation-v1",
  systemPrompt: SYSTEM_PROMPT,
  followUpPrompt: FOLLOW_UP_PROMPT,
});

/** Validate every bracket marker so a literal model placeholder cannot slip through. */
export function parseCitationMarkers(answer: string, sourceCount: number): CitationValidation {
  const indices: number[] = [];
  let invalid = false;
  const markers = [...answer.matchAll(/\[([^\]\r\n]{1,40})\]/g)];

  for (const marker of markers) {
    const body = marker[1].trim();
    if (!/^\d+(?:\s*,\s*\d+)*$/.test(body)) {
      invalid = true;
      continue;
    }
    for (const token of body.split(",")) {
      const index = Number(token.trim());
      indices.push(index);
      if (!Number.isInteger(index) || index < 1 || index > sourceCount) invalid = true;
    }
  }

  return {
    valid: markers.length > 0 && indices.length > 0 && !invalid,
    indices: [...new Set(indices)],
  };
}

function boundedText(value: string, max: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

export function buildFollowUpGenerationInput(
  question: string,
  answer: string,
  sources: readonly EvidenceExcerpt[],
): string {
  const evidence = sources.slice(0, 6).map((source) =>
    `[${source.n}] ${boundedText(source.title, 180)}\n${boundedText(String(source.text ?? ""), 560)}`,
  ).join("\n\n---\n\n");
  return [
    `QUESTION: ${boundedText(question, 500)}`,
    `ANSWER: ${boundedText(answer, 1_200)}`,
    "EVIDENCE:",
    evidence,
    "Every suggestion must be answerable from the EVIDENCE above.",
  ].join("\n\n");
}

export function parseFollowUpCandidates(output: string): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const question = line
      .replace(/^\s*(?:[-*•]\s*|\d+[.)]\s*)/, "")
      .trim();
    if (question.length <= 10 || question.length >= 200 || !question.endsWith("?")) continue;
    const key = question.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(question);
    if (candidates.length >= 5) break;
  }
  return candidates;
}

export async function selectAnswerableFollowUps(
  candidates: readonly string[],
  isAnswerable: (question: string) => Promise<boolean>,
): Promise<string[]> {
  const checked = await Promise.all(candidates.slice(0, 5).map(async (question) => {
    try {
      return { question, answerable: await isAnswerable(question) };
    } catch {
      return { question, answerable: false };
    }
  }));
  return checked.filter((item) => item.answerable).slice(0, 3).map((item) => item.question);
}
