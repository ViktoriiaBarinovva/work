export class FlowiseTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Flowise request timed out after ${timeoutMs}ms`);
    this.name = 'FlowiseTimeoutError';
  }
}

export class EmptyLlmResponseError extends Error {
  constructor() {
    super('LLM returned an empty response');
    this.name = 'EmptyLlmResponseError';
  }
}

export class InvalidLlmJsonError extends Error {
  constructor(message = 'LLM returned invalid SEO JSON') {
    super(message);
    this.name = 'InvalidLlmJsonError';
  }
}
