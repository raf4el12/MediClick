import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../decorators/index.js';
import { RequirePermissions } from '../decorators/require-permissions.decorator.js';
import { PaginationImproved } from '../utils/value-objects/pagination-improved.value-object.js';
import { SecurityAuditService } from './security-audit.service.js';
import { FindAuditLogsDto } from './dto/find-audit-logs.dto.js';
import { PaginatedAuditLogResponseDto } from './dto/audit-log-response.dto.js';

@ApiTags('Security Audit')
@Controller('security-audit-logs')
export class SecurityAuditController {
  constructor(private readonly securityAuditService: SecurityAuditService) {}

  @Get()
  @Auth()
  @RequirePermissions('READ', 'SECURITY_AUDIT')
  @ApiOperation({
    summary:
      'Bitácora de eventos de seguridad (login fallido, acceso denegado)',
  })
  @ApiResponse({ status: 200, type: PaginatedAuditLogResponseDto })
  async findAll(
    @Query() dto: FindAuditLogsDto,
  ): Promise<PaginatedAuditLogResponseDto> {
    const pagination = new PaginationImproved(
      dto.searchValue,
      dto.currentPage,
      dto.pageSize,
      dto.orderBy,
      dto.orderByMode,
    );
    return this.securityAuditService.findAllPaginated(pagination, {
      eventType: dto.eventType,
      from: dto.from,
      to: dto.to,
    });
  }
}
