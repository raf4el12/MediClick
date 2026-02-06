import { Module } from '@nestjs/common';
import { PrismaUserRepository } from '../infrastructure/persistence/prisma-user.repository.js';
import { CreateInternalUserUseCase } from './use-cases/create-internal-user.use-case.js';
import { UsersController } from '../interfaces/controllers/users.controller.js';

@Module({
  controllers: [UsersController],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    CreateInternalUserUseCase,
  ],
  exports: ['IUserRepository'],
})
export class UsersModule {}
