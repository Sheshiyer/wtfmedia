// New turns use direct Claude. Historical model strings remain readable in saved records.
export const DEFAULT_MODEL = "claude-sonnet-5-5";
export const MODELS = [{ id: DEFAULT_MODEL, label: "Claude Sonnet 5.5", vendor: "Anthropic" }];
export const isValidModel = (id: string) => id === DEFAULT_MODEL;
