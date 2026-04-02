# Plan de Migración a PBAC (Permission-Based Access Control)

**Para: Agente Claude Code**
**De: Arquitecto de Software Principal**

## Contexto del Negocio y Arquitectura
Estamos migrando MediClick de un sistema de roles rígido (Enum `UserRole` en Prisma) hacia un sistema Dinámico de Permisos y Roles (PBAC). El software es un SaaS B2B Multi-Tenant para clínicas. 
Se requiere que los administradores de clínicas puedan crear roles personalizados y asignarles permisos granulares con checkboxes desde la interfaz de usuario.
El stack es **NestJS** (Backend, Arquitectura Hexagonal/DDD) y **Next.js 13+** (Frontend, Redux).

## Reglas Críticas de Implementación
1. **Rendimiento:** Mantener el JWT ligero (solo conservar el `userId` y `roleId`). La validación de permisos en el Backend debe realizarse mediante un `PermissionsGuard` de NestJS que consulte los permisos asignados al `roleId` directamente desde **Redis** (Capa de Caché), evitando sobrecargar PostgreSQL en cada petición.
2. **Estructura Cero Acoplamiento:** Respetar estrictamente la Arquitectura Hexagonal y DDD que ya existe en los módulos de NestJS (`domain`, `application`, `infrastructure`, `interfaces`).

---

## FASE 1: Base de Datos (Prisma Schema)
Ruta: `server/prisma/schema.prisma`

1. **Eliminar Enum Obsoleto:** Borrar `enum UserRole`.
2. **Modificar Modelo `Users`:** 
   - Reemplazar el campo `role UserRole` por `roleId Int?` y establecer la relación con la nueva tabla `Roles`. 
   - Asegurarse de mantener el campo `clinicId` en `Users`.
3. **Crear Modelo `Roles`:**
   - Campos: `id`, `name`, `description`, `isSystem` (Boolean, default: false), `clinicId` (Int?). Relaciones con `Users` y `RolePermissions`.
4. **Crear Modelo `Permissions`:**
   - Campos: `id`, `action` (Ej. 'CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'), `subject` (Ej. 'APPOINTMENTS', 'DOCTORS', 'USERS', 'ALL'), `description`. Relaciones con `RolePermissions`.
5. **Crear Modelo Pivote `RolePermissions`:**
   - Campos: `roleId`, `permissionId` (llaves foráneas).

**Acción:** Ejecutar `npx prisma generate` y preparar una migración SQL (advertencia: requerirá limpiar la tabla actual de usuarios).

---

## FASE 2: Backend (NestJS Server)
Rutas principales: `server/src/modules/` y `server/src/shared/guards/`

1. **Crear Módulos Nuevos (`RolesModule`, `PermissionsModule`):**
   - Implementar CRUD usando Hexagonal. Deben poder crear roles, listar permisos disponibles y asignar/remover permisos de un rol (solo accesible para clínicas si `clinicId` concuerda).
2. **Refactorizar Guards de Seguridad (`permissions.guard.ts`):**
   - Borrar/deprecatear el antiguo `@Roles()`. Crear `@RequirePermissions(action, subject)` u otro formato string puro como `@RequirePermissions('CREATE:DOCTORS')`.
   - Modificar el guardián para que extraiga el `roleId` del usuario autenticado e interactúe con el servicio de Cache de Nest (conectado a Redis) para consultar un array bidimensional de `[action, subject]` permitidos. Si el caché falla, hace query a DB y setea el caché.
3. **Crear Seeder Maestro (`seed-rbac.ts`):**
   - Este seeder (ejecutable desde CLI) debe inyectar todos los permisos core definidos por el desarrollador.
   - Debe crear el rol `SUPER_ADMIN` (`isSystem: true`) y encadenarle *todos* los permisos posibles.
4. **Refactorización Masiva de Controladores:**
   - Buscar todos los controladores que usaban la antigua restricción de `UserRole.ADMIN` y actualizar la firma del decorador para usar la nueva protección modular por permiso.

---

## FASE 3: Frontend (Next.js Client)
Rutas principales: `client/src/`

1. **Modificar Types (`auth.types.ts`):**
   - Eliminar las referencias estáticas al Enum antiguo. Agregar arreglos de `permissions` a las interfaces de usuario logueado.
2. **Modificar `redux-store` y Estado de Conexión:**
   - En el bloque condicional donde el frontend comprueba si el usuario está activo (ej. endpoint `/auth/me`), el backend debe responder no solo el perfil, sino el Array de *Permisos Aplanados* (ej: `['READ:PATIENTS', 'CREATE:APPOINTMENTS']`). Guardar esto en Redux.
3. **Crear Componente `<Can />` (`@core/components`):**
   - Construir un componente de React abstracto para el renderizado condicional.
   - Props esperados: `action: string`, `subject: string`.
   - Lógica: Consumir permisos del estado global (Redux). Si hace match, renderizar `children`. Si no, null o componente de reemplazo.
4. **Limpieza UI de Vistas Existentes:**
   - Borrar toda la lógica anidada preexistente `if (role === 'ADMIN')`. Proteger las páginas completas (o secciones enteras mediante Higher-Order Components de layout) llamando a la verificación de permisos en las vistas principales.

---
**Nota final para Claude:** Ejecutar estos cambios por fase de forma iterativa, confirmando paso a paso para evitar que el compilador TypeScript se sature con errores de tipos rompiendo el Linter en cascada. Empezar estrictamente por `schema.prisma`.
