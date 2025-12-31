import { Controller, Get } from '@nestjs/common';
import { CacheService } from './shared/cache/cache.service';
import { Public } from './shared/auth/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly cacheService: CacheService) {}

  @Public()
  @Get()
  getRoot(): string {
    return '¡Bienvenido a la API de mi aplicación MediClick!';
  }
}
