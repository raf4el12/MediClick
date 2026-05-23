# MediClick — Claude Code Context

## Stack
- **Backend**: NestJS + GraphQL (Apollo) + Prisma ORM + PostgreSQL + Redis
- **Frontend**: Next.js 14 (App Router) + MUI v5 + Redux Toolkit + React Query + React Hook Form + Zod
- **Auth**: JWT + Passport + RBAC con roles (ADMIN, CLINIC_ADMIN, DOCTOR, PATIENT)
- **Pagos**: MercadoPago
- **Infra**: Docker Compose, pnpm workspaces (monorepo)

## Estructura
```
server/src/
  modules/        ← un módulo NestJS por dominio
  shared/         ← guards, decorators, filtros globales
  prisma/         ← cliente Prisma

client/src/
  app/            ← Next.js App Router (rutas por rol)
  @core/          ← componentes base
  @layouts/       ← layouts por tipo de usuario
  views/          ← páginas completas
  redux-store/    ← slices Redux
  services/       ← llamadas GraphQL/REST
```

## Decisiones arquitecturales clave
- **Multi-tenant**: cada clínica es un tenant. Los guards validan `clinicId` en cada request.
- **RBAC**: permisos granulares por recurso. Ver `server/src/modules/permissions/`.
- **GraphQL**: única API pública. REST solo para webhooks (MercadoPago).
- **Schedules**: el módulo `scheduler` usa `@nestjs/schedule` para jobs de disponibilidad.

## Comandos dev
```bash
# Backend
cd server && pnpm dev           # NestJS en watch mode
cd server && pnpm prisma studio # GUI de base de datos

# Frontend  
cd client && pnpm dev           # Next.js dev server

# Ambos con Docker
docker compose up               # Levanta postgres + redis
```

## Convenciones
- Módulos NestJS: resolver → service → repository pattern con Prisma.
- Mutations GraphQL siempre retornan el objeto completo actualizado.
- Validación con `class-validator` en DTOs del servidor, Zod en el cliente.
- Guards de autorización: `@UseGuards(JwtAuthGuard, PermissionsGuard)` — siempre ambos.

## Memoria del proyecto
Antes de explorar un módulo: `mem_context "nombre del módulo"` — puede haber decisiones previas guardadas.
Al terminar trabajo significativo: `mem_save` con What/Why/Where/Learned.
