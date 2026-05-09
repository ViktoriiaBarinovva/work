import { EmptyLlmResponseError, InvalidLlmJsonError } from './seo.errors';
import type { SeoGenerationResult } from './seo.types';

export function parseSeoJson(raw: string): SeoGenerationResult {
  const normalized = stripCodeFence(raw).trim();
  if (!normalized) {
    throw new EmptyLlmResponseError();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new InvalidLlmJsonError('LLM response is not valid JSON');
  }

  if (!isSeoGenerationResult(parsed)) {
    throw new InvalidLlmJsonError('LLM JSON does not match required schema');
  }

  return parsed;
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isSeoGenerationResult(value: unknown): value is SeoGenerationResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.title) &&
    isBoundedString(value.meta_description, 50, 180) &&
    isNonEmptyString(value.h1) &&
    isNonEmptyString(value.description) &&
    Array.isArray(value.bullets) &&
    value.bullets.length >= 3 &&
    value.bullets.length <= 6 &&
    value.bullets.every(isNonEmptyString)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBoundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}
