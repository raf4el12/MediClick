import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from '../domain/interfaces/authenticated-user.interface.js';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const user = req.user as AuthenticatedUser | undefined;

      const logData: Record<string, unknown> = {
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
      };

      if (user) {
        logData.userId = user.id;
        logData.role = user.roleName;
        if (user.clinicId) logData.clinicId = user.clinicId;
      }

      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;
      const extra = JSON.stringify(logData);

      if (statusCode >= 500) {
        this.logger.error(`${message} ${extra}`);
      } else if (statusCode >= 400) {
        this.logger.warn(`${message} ${extra}`);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
