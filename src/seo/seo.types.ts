export interface SeoGenerationInput {
  product_name: string;
  category: string;
  keywords: string[];
}

export interface SeoGenerationResult {
  title: string;
  meta_description: string;
  h1: string;
  description: string;
  bullets: string[];
}

export interface StreamEvent {
  type: 'token' | 'result' | 'error';
  data: string | SeoGenerationResult | { code: string; message: string };
}
