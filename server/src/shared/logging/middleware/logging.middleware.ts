import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from 'src/shared/logging/logging.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(LoggingService) private readonly loggingService: LoggingService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      if (statusCode < 400) {
        this.loggingService.info('HTTP Request', {
          statusCode,
          method,
          url: originalUrl,
          ip,
          responseTime,
          userAgent,
        });
      } else {
        this.loggingService.error('HTTP Error', {
          statusCode,
          method,
          url: originalUrl,
          ip,
          responseTime,
          userAgent,
        });
      }
    });

    next();
  }
}
