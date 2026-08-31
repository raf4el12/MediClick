/**
 * Script standalone para (re)sincronizar solo RBAC (roles + permisos) sin
 * tocar el resto de los datos de negocio. Útil en un entorno donde no se
 * quiere correr `seed.ts` completo (que además limpia y recrea todo).
 *
 * SDD-012: este script ya NO mantiene su propia matriz. Es un wrapper
 * delgado sobre `rbac-policy.ts`, la única fuente declarativa de
 * subjects/actions/roles→permisos. Si algo aquí y en `seed.ts` llegaran a
 * divergir, sería un bug de este archivo, no una segunda fuente legítima.
 *
 * A diferencia de `seed.ts` (que crea desde cero), este script hace upsert:
 * permite ejecutarse contra una base con datos existentes sin duplicar filas.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';
import {
  buildPermissionCatalog,
  ROLE_PERMISSIONS,
  SYSTEM_ROLE_DESCRIPTIONS,
  SYSTEM_ROLE_ORDER,
} from './rbac-policy.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedRbac() {
  console.log('🔐 Iniciando seed de RBAC (fuente: rbac-policy.ts)...\n');

  // 1. Upsert del catálogo de permisos.
  const permissionDefs = buildPermissionCatalog();
  console.log(`   📋 Sincronizando ${permissionDefs.length} permisos...`);

  const permissionMap = new Map<string, number>(); // 'ACTION:SUBJECT' -> id

  for (const perm of permissionDefs) {
    const row = await prisma.permissions.upsert({
      where: {
        action_subject: { action: perm.action, subject: perm.subject },
      },
      update: { description: perm.description },
      create: {
        action: perm.action,
        subject: perm.subject,
        description: perm.description,
      },
    });
    permissionMap.set(`${perm.action}:${perm.subject}`, row.id);
  }

  console.log(`   ✅ ${permissionMap.size} permisos listos\n`);

  // 2. Upsert de roles de sistema con sus permisos declarados.
  for (const roleName of SYSTEM_ROLE_ORDER) {
    console.log(`   🎭 Procesando rol: ${roleName}`);

    const permissionIds = ROLE_PERMISSIONS[roleName]
      .map((key) => permissionMap.get(key))
      .filter((id): id is number => id !== undefined);

    let role = await prisma.roles.findFirst({
      where: { name: roleName, isSystem: true },
    });

    if (!role) {
      role = await prisma.roles.create({
        data: {
          name: roleName,
          description: SYSTEM_ROLE_DESCRIPTIONS[roleName],
          isSystem: true,
          clinicId: null,
        },
      });
      console.log(`      ➕ Rol creado: ${roleName}`);
    } else {
      await prisma.roles.update({
        where: { id: role.id },
        data: { description: SYSTEM_ROLE_DESCRIPTIONS[roleName] },
      });
      console.log(`      ♻️  Rol actualizado: ${roleName}`);
    }

    // Sincroniza permisos: borra y recrea según la política declarativa.
    await prisma.rolePermissions.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermissions.createMany({
        data: permissionIds.map((pid) => ({
          roleId: role.id,
          permissionId: pid,
        })),
      });
    }

    console.log(
      `      ✅ ${permissionIds.length} permisos asignados a ${roleName}\n`,
    );
  }

  console.log('🎉 Seed RBAC completado exitosamente\n');
}

seedRbac()
  .catch((error) => {
    console.error('❌ Error en seed RBAC:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
