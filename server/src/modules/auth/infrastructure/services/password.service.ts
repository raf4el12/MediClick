import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IPasswordService } from '../../../../shared/domain/contracts/password-service.interface.js';

@Injectable()
export class PasswordService implements IPasswordService {
  // OWASP A02: cost factor 12 (OWASP recomienda >=10; 12 da margen frente al
  // avance de hardware sin penalizar el login de forma perceptible).
  private readonly SALT_ROUNDS = 12;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
