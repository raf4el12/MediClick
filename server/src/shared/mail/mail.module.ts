import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { TemplateService } from './template.service.js';

@Global()
@Module({
  providers: [TemplateService, MailService],
  exports: [MailService],
})
export class MailModule {}
