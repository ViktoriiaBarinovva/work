import { Module } from '@nestjs/common';
import { FlowiseClientService } from './flowise-client.service';
import { SeoController } from './seo.controller';

@Module({
  controllers: [SeoController],
  providers: [FlowiseClientService],
})
export class SeoModule {}
