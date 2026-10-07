import { Controller, Get, INestApplication, SetMetadata } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { GqlThrottlerGuard } from './gql-throttler.guard.js';
import { Auth, REQUIRES_AUTH_KEY } from '../decorators/auth.decorator.js';

const JWT_SECRET = 'throttler-spec-secret';
const LIMIT = 2;

@Controller()
class ProbeController {
  @Get('public')
  publicRoute() {
    return 'ok';
  }

  // Solo la marca que pone @Auth(): la autenticación real no participa aquí,
  // porque el throttler corre antes que los guards de la ruta.
  @Get('private')
  @SetMetadata(REQUIRES_AUTH_KEY, true)
  privateRoute() {
    return 'ok';
  }
}

const jwt = new JwtService();
const forgedToken = (sub: number) =>
  jwt.sign({ sub, roleId: 1 }, { secret: 'otro-secreto' });
const validToken = (sub: number) =>
  jwt.sign({ sub, roleId: 1 }, { secret: JWT_SECRET });

describe('GqlThrottlerGuard (HTTP)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET })],
        }),
        ThrottlerModule.forRoot([{ name: 'short', ttl: 60_000, limit: LIMIT }]),
      ],
      controllers: [ProbeController],
      providers: [{ provide: APP_GUARD, useClass: GqlThrottlerGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('en una ruta pública cuenta por IP aunque cada request traiga un token con otro sub', async () => {
    const statuses: number[] = [];
    for (let sub = 1; sub <= LIMIT + 1; sub++) {
      const res = await request(app.getHttpServer())
        .get('/public')
        .set('Authorization', `Bearer ${forgedToken(sub)}`);
      statuses.push(res.status);
    }

    expect(statuses).toEqual([200, 200, 429]);
  });

  it('en una ruta autenticada, un token con firma inválida cuenta por IP', async () => {
    const statuses: number[] = [];
    for (let sub = 1; sub <= LIMIT + 1; sub++) {
      const res = await request(app.getHttpServer())
        .get('/private')
        .set('Authorization', `Bearer ${forgedToken(sub)}`);
      statuses.push(res.status);
    }

    expect(statuses).toEqual([200, 200, 429]);
  });
  it('en una ruta pública, tokens válidos de varias cuentas no suman cupos', async () => {
    const statuses: number[] = [];
    for (let sub = 1; sub <= LIMIT + 1; sub++) {
      const res = await request(app.getHttpServer())
        .get('/public')
        .set('Authorization', `Bearer ${validToken(sub)}`);
      statuses.push(res.status);
    }

    expect(statuses).toEqual([200, 200, 429]);
  });

  it('en una ruta autenticada, dos usuarios válidos tras la misma IP no comparten cupo', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < LIMIT; i++) {
      for (const sub of [1, 2]) {
        const res = await request(app.getHttpServer())
          .get('/private')
          .set('Authorization', `Bearer ${validToken(sub)}`);
        statuses.push(res.status);
      }
    }

    expect(statuses).toEqual([200, 200, 200, 200]);
  });
});

describe('@Auth()', () => {
  it('marca la ruta como autenticada para el throttler', () => {
    class Probe {
      @Auth()
      handler() {}
    }

    const marked = new Reflector().get<boolean>(
      REQUIRES_AUTH_KEY,
      Object.getOwnPropertyDescriptor(Probe.prototype, 'handler')!
        .value as () => void,
    );
    expect(marked).toBe(true);
  });
});
