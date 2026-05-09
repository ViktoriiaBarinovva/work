import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { GenerateSeoDto } from './dto/generate-seo.dto';
import { EmptyLlmResponseError, FlowiseTimeoutError, InvalidLlmJsonError } from './seo.errors';
import { FlowiseClientService } from './flowise-client.service';
import { StreamEvent } from './seo.types';

@Controller('generate-seo')
export class SeoController {
  constructor(private readonly flowiseClient: FlowiseClientService) {}

  @Post()
  async generate(@Body() dto: GenerateSeoDto, @Res() response: Response): Promise<void> {
    response.status(HttpStatus.OK);
    response.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
    response.setHeader('cache-control', 'no-cache, no-transform');
    response.setHeader('x-accel-buffering', 'no');
    response.flushHeaders();

    try {
      for await (const event of this.flowiseClient.generateSeo(dto)) {
        writeEvent(response, event);
      }
    } catch (error) {
      writeEvent(response, {
        type: 'error',
        data: mapError(error),
      });
    } finally {
      response.end();
    }
  }
}

function writeEvent(response: Response, event: StreamEvent): void {
  response.write(`${JSON.stringify(event)}\n`);
}

function mapError(error: unknown): { code: string; message: string } {
  if (error instanceof FlowiseTimeoutError) {
    return { code: 'FLOWISE_TIMEOUT', message: error.message };
  }
  if (error instanceof EmptyLlmResponseError) {
    return { code: 'EMPTY_LLM_RESPONSE', message: error.message };
  }
  if (error instanceof InvalidLlmJsonError) {
    return { code: 'INVALID_LLM_JSON', message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'FLOWISE_REQUEST_FAILED', message: error.message };
  }
  return { code: 'UNKNOWN_ERROR', message: 'Unexpected generation error' };
}
