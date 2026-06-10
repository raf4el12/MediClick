---
name: nestjs-module
description: Use when creating or modifying NestJS backend modules in server/src/modules/. Covers DDD structure (domain/application/infrastructure/interfaces), repository pattern with injection tokens, use-cases with execute(), and module wiring with dependency imports.
---

# NestJS Module patterns

## Directory structure

Every module follows this exact layout:

```
server/src/modules/<name>/
├── domain/
│   ├── entities/
│   │   └── <name>.entity.ts
│   ├── interfaces/
│   │   └── <name>-data.interface.ts
│   ├── constants/
│   │   └── <name>.constants.ts
│   └── repositories/
│       └── <name>.repository.ts       ← I<Name>Repository interface
├── application/
│   ├── use-cases/
│   │   └── <action>-<name>.use-case.ts
│   ├── dto/
│   │   ├── <action>-<name>.dto.ts
│   │   └── <name>-response.dto.ts
│   └── <name>.module.ts
├── infrastructure/
│   └── persistence/
│       └── prisma-<name>.repository.ts
└── interfaces/
    └── controllers/
        └── <name>.controller.ts
```

## Repository pattern

**Interface** (`domain/repositories/`):
```typescript
export interface IAppointmentRepository {
  findById(id: number): Promise<AppointmentWithRelations | null>;
  create(data: CreateAppointmentData): Promise<AppointmentWithRelations>;
  // ...
}
```

**Implementation** (`infrastructure/persistence/`):
```typescript
@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}
  // ...
}
```

**Wiring** in module:
```typescript
providers: [
  { provide: 'IAppointmentRepository', useClass: PrismaAppointmentRepository },
  CreateAppointmentUseCase,
],
exports: ['IAppointmentRepository'],
```

## Use-cases

- Single `execute()` method
- Inject repositories via `@Inject('ITokenName')` — never PrismaService directly
- Do validation first, then execute
- Use `this.timezoneResolver` for timezone-aware logic
- Throw `BadRequestException`, `ConflictException`, `NotFoundException`, `ForbiddenException` from `@nestjs/common`
- Return DTOs, never raw entity/Prisma types

## Guards & auth

```typescript
@Auth()
@RequirePermissions('ACTION', 'RESOURCE')
```

- `@Auth()` = shorthand for `@UseGuards(JwtAuthGuard)` + sets current user
- `@RequirePermissions('CREATE', 'APPOINTMENTS')` — second guard
- Available actions: `CREATE`, `READ`, `UPDATE`, `DELETE`
- Rate limiting: `@Throttle({ long: { ttl: 60000, limit: 10 } })`

## Multi-tenant

```typescript
@CurrentClinic() clinicId: number | null
@CurrentUser('id') userId: number
@CurrentUser('roleName') role: string
```

- `clinicId = null` means super-admin (bypass clinic scope)
- Always validate clinic boundaries in the use-case, not the controller

## Event emitter

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
this.eventEmitter.emit('resource.event', payload);
```

Event naming: `resource.event_name` (snake_case). Listeners in `application/listeners/`.

## Transaction isolation

For overlap-sensitive operations (appointments, payments):
```typescript
this.prisma.$transaction(async (tx) => { ... }, { isolationLevel: 'Serializable' });
```
