import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL, MODELS, isValidModel } from '@/lib/models';

describe('new Ask WTF generation models', () => {
  it('offers only direct Claude and rejects legacy or arbitrary model routes', () => {
    expect(DEFAULT_MODEL).toBe('claude-sonnet-5-5');
    expect(MODELS.map(model => model.id)).toEqual([DEFAULT_MODEL]);
    expect(isValidModel(DEFAULT_MODEL)).toBe(true);
    for (const model of ['z-ai/glm-5.3-flash', 'google/gemini-3.5-flash', 'meta/llama-3.3-70b-instruct', 'arbitrary']) expect(isValidModel(model)).toBe(false);
  });
});
