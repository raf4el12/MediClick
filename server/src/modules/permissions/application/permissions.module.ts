import { Module } from '@nestjs/common';
import { PermissionController } from '../interfaces/controllers/permission.controller.js';
import { FindAllPermissionsUseCase } from './use-cases/find-all-permissions.use-case.js';
import { PrismaPermissionRepository } from '../infrastructure/persistence/prisma-permission.repository.js';

@Module({
  controllers: [PermissionController],
  providers: [
    FindAllPermissionsUseCase,
    {
      provide: 'IPermissionRepository',
      useClass: PrismaPermissionRepository,
    },
  ],
  exports: ['IPermissionRepository'],
})
export class PermissionsModule {}
