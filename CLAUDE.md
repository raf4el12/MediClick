# MediClick — Claude Code Context

## Stack
- **Backend**: NestJS + API REST (GraphQL solo para `patientRecord`/`myPatientRecord`) + Prisma ORM + PostgreSQL + Redis
- **Frontend**: Next.js 16 (App Router) + React 19 + MUI 7 + Materio v5 adaptada y Tailwind 3.4 ([ADR-0003](docs/adr/0003-materio-sistema-de-diseno.md)) + Redux Toolkit + React Query + React Hook Form + Zod
- **Auth**: JWT + Passport + RBAC con roles (SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, PATIENT)
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
  services/       ← llamadas REST (y GraphQL del expediente)
```

## Decisiones arquitecturales clave
- **Multi-tenant**: cada clínica es un tenant. Los guards validan `clinicId` en cada request.
- **RBAC**: permisos granulares por recurso; la matriz vive en `server/prisma/rbac-policy.ts`.
- **API**: REST; GraphQL solo expone el expediente del paciente.
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

## Verificación previa al commit

`.githooks/pre-commit` valida cada commit sobre lo que está en el índice: tipos
y pruebas relacionadas detienen el commit, el lint es informativo. Se activa
sola en cada `pnpm install`. Detalle en `docs/verificacion-previa-al-commit.md`.

## Convenciones
- Módulos NestJS: `application` / `domain` / `infrastructure` / `interfaces`; casos de uso sobre repositorios Prisma (ver `AGENTS.md`).
- Validación con `class-validator` en DTOs del servidor, Zod en el cliente.
- Autorización: `@Auth()` (JWT + sede + permisos) junto con `@RequirePermissions(ACCIÓN, RECURSO)`.

## Memoria del proyecto
Antes de explorar un módulo: `mem_context "nombre del módulo"` — puede haber decisiones previas guardadas.
Al terminar trabajo significativo: `mem_save` con What/Why/Where/Learned.
