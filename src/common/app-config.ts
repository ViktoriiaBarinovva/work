export interface AppConfig {
  port: number;
  flowiseBaseUrl: string;
  flowiseChatflowId: string;
  flowiseApiKey?: string;
  flowiseTimeoutMs: number;
}

export function getAppConfig(): AppConfig {
  return {
    port: readNumber('PORT', 3000),
    flowiseBaseUrl: readRequired('FLOWISE_BASE_URL').replace(/\/+$/, ''),
    flowiseChatflowId: readRequired('FLOWISE_CHATFLOW_ID'),
    flowiseApiKey: process.env.FLOWISE_API_KEY || undefined,
    flowiseTimeoutMs: readNumber('FLOWISE_TIMEOUT_MS', 30_000),
  };
}

function readRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive number`);
  }

  return parsed;
}
