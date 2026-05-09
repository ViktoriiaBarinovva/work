import { EmptyLlmResponseError, InvalidLlmJsonError } from '../src/seo/seo.errors';
import { parseSeoJson } from '../src/seo/seo-json.parser';

describe('parseSeoJson', () => {
  const validJson = {
    title: 'Кофемолка Burr Pro купить для дома',
    meta_description: 'Кофемолка Burr Pro для ровного помола кофе дома: стальные жернова, 40 настроек, компактный корпус и быстрая доставка.',
    h1: 'Кофемолка Burr Pro',
    description: 'Burr Pro помогает получить стабильный помол для эспрессо, фильтра и френч-пресса.',
    bullets: ['40 степеней помола', 'Стальные жернова', 'Компактный корпус'],
  };

  it('parses plain JSON', () => {
    expect(parseSeoJson(JSON.stringify(validJson))).toEqual(validJson);
  });

  it('parses fenced JSON', () => {
    expect(parseSeoJson(`\`\`\`json\n${JSON.stringify(validJson)}\n\`\`\``)).toEqual(validJson);
  });

  it('rejects empty output', () => {
    expect(() => parseSeoJson('')).toThrow(EmptyLlmResponseError);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseSeoJson('{bad')).toThrow(InvalidLlmJsonError);
  });

  it('rejects schema mismatch', () => {
    expect(() => parseSeoJson(JSON.stringify({ ...validJson, bullets: [] }))).toThrow(InvalidLlmJsonError);
  });
});
