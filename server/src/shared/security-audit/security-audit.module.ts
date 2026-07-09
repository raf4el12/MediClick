import { Global, Module } from '@nestjs/common';
import { SecurityAuditService } from './security-audit.service.js';
import { SecurityAuditController } from './security-audit.controller.js';

@Global()
@Module({
  controllers: [SecurityAuditController],
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
