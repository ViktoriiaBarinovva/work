import { Injectable } from '@nestjs/common';
import { getAppConfig } from '../common/app-config';
import { EmptyLlmResponseError, FlowiseTimeoutError } from './seo.errors';
import { parseSeoJson } from './seo-json.parser';
import { SeoGenerationInput, StreamEvent } from './seo.types';

@Injectable()
export class FlowiseClientService {
  private readonly config = getAppConfig();

  async *generateSeo(input: SeoGenerationInput): AsyncGenerator<StreamEvent> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.flowiseTimeoutMs);

    try {
      const response = await fetch(this.predictionUrl(), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(this.requestBody(input)),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Flowise responded with ${response.status}: ${body || response.statusText}`);
      }

      let raw = '';
      for await (const token of this.readResponseTokens(response)) {
        raw += token;
        yield { type: 'token', data: token };
      }

      const result = parseSeoJson(raw);
      yield { type: 'result', data: result };
    } catch (error) {
      if (isAbortError(error)) {
        throw new FlowiseTimeoutError(this.config.flowiseTimeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private predictionUrl(): string {
    return `${this.config.flowiseBaseUrl}/api/v1/prediction/${this.config.flowiseChatflowId}`;
  }

  private headers(): HeadersInit {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'text/event-stream, application/json',
    };

    if (this.config.flowiseApiKey) {
      headers.authorization = `Bearer ${this.config.flowiseApiKey}`;
    }

    return headers;
  }

  private requestBody(input: SeoGenerationInput): Record<string, unknown> {
    return {
      question: buildQuestion(input),
      streaming: true,
      overrideConfig: {
        vars: {
          product_name: input.product_name,
          category: input.category,
          keywords: input.keywords.join(', '),
        },
      },
    };
  }

  private async *readResponseTokens(response: Response): AsyncGenerator<string> {
    const contentType = response.headers.get('content-type') ?? '';

    if (!response.body || contentType.includes('application/json')) {
      const text = await response.text();
      const extracted = extractTextFromJsonResponse(text);
      if (!extracted.trim()) {
        throw new EmptyLlmResponseError();
      }
      yield extracted;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let hasToken = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const token = parseSseToken(line);
        if (!token) {
          continue;
        }

        hasToken = true;
        yield token;
      }
    }

    const tail = parseSseToken(buffer);
    if (tail) {
      hasToken = true;
      yield tail;
    }

    if (!hasToken) {
      throw new EmptyLlmResponseError();
    }
  }
}

function buildQuestion(input: SeoGenerationInput): string {
  return [
    `product_name: ${input.product_name}`,
    `category: ${input.category}`,
    `keywords: ${input.keywords.join(', ')}`,
  ].join('\n');
}

function parseSseToken(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data:')) {
    return null;
  }

  const payload = trimmed.slice('data:'.length).trim();
  if (!payload || payload === '[DONE]') {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    if (typeof parsed === 'string') {
      return parsed;
    }
    if (isRecord(parsed) && typeof parsed.data === 'string') {
      return parsed.data;
    }
    if (isRecord(parsed) && typeof parsed.text === 'string') {
      return parsed.text;
    }
    if (isRecord(parsed) && typeof parsed.answer === 'string') {
      return parsed.answer;
    }
    return null;
  } catch {
    return payload;
  }
}

function extractTextFromJsonResponse(text: string): string {
  if (!text.trim()) {
    return '';
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed === 'string') {
      return parsed;
    }
    if (isRecord(parsed)) {
      const candidate = parsed.text ?? parsed.answer ?? parsed.result ?? parsed.json;
      return typeof candidate === 'string' ? candidate : JSON.stringify(candidate ?? parsed);
    }
    return JSON.stringify(parsed);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
