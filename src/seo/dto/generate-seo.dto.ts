import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsString, Length } from 'class-validator';

export class GenerateSeoDto {
  @IsString()
  @Length(2, 140)
  @Transform(({ value }) => normalizeText(value))
  product_name!: string;

  @IsString()
  @Length(2, 80)
  @Transform(({ value }) => normalizeText(value))
  category!: string;

  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @Length(2, 60, { each: true })
  @Transform(({ value }) => normalizeKeywords(value))
  keywords!: string[];
}

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

function normalizeKeywords(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((keyword) => keyword.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((keyword) => (typeof keyword === 'string' ? keyword.trim().replace(/\s+/g, ' ') : keyword))
      .filter(Boolean);
  }

  return value;
}
