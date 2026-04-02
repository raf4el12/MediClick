import { Module } from '@nestjs/common';
import { RoleController } from '../interfaces/controllers/role.controller.js';
import { FindAllRolesUseCase } from './use-cases/find-all-roles.use-case.js';
import { CreateRoleUseCase } from './use-cases/create-role.use-case.js';
import { UpdateRoleUseCase } from './use-cases/update-role.use-case.js';
import { DeleteRoleUseCase } from './use-cases/delete-role.use-case.js';
import { PrismaRoleRepository } from '../infrastructure/persistence/prisma-role.repository.js';

@Module({
  controllers: [RoleController],
  providers: [
    FindAllRolesUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    {
      provide: 'IRoleRepository',
      useClass: PrismaRoleRepository,
    },
  ],
  exports: ['IRoleRepository'],
})
export class RolesModule {}
