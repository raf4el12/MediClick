import { UserEntity } from '../entities/user.entity.js';
import { CreateInternalUserData } from '../interfaces/user-data.interface.js';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: number): Promise<UserEntity | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByDni(typeDocument: string, numberDocument: string): Promise<boolean>;
  createInternalUser(data: CreateInternalUserData): Promise<UserEntity>;
}
