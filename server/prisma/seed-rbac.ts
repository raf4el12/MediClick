import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/* ─── Definición de permisos core ─── */

interface PermissionDef {
  action: string;
  subject: string;
  description: string;
}

const SUBJECTS = [
  'USERS',
  'DOCTORS',
  'PATIENTS',
  'APPOINTMENTS',
  'SCHEDULES',
  'AVAILABILITY',
  'SPECIALTIES',
  'CATEGORIES',
  'CLINICS',
  'CLINICAL_NOTES',
  'PRESCRIPTIONS',
  'MEDICAL_HISTORY',
  'NOTIFICATIONS',
  'REPORTS',
  'HOLIDAYS',
  'SCHEDULE_BLOCKS',
  'ROLES',
] as const;

const ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE'] as const;

const SUBJECT_LABELS: Record<string, string> = {
  USERS: 'usuarios',
  DOCTORS: 'doctores',
  PATIENTS: 'pacientes',
  APPOINTMENTS: 'citas',
  SCHEDULES: 'horarios',
  AVAILABILITY: 'disponibilidad',
  SPECIALTIES: 'especialidades',
  CATEGORIES: 'categorías',
  CLINICS: 'sedes',
  CLINICAL_NOTES: 'notas clínicas',
  PRESCRIPTIONS: 'recetas',
  MEDICAL_HISTORY: 'historial médico',
  NOTIFICATIONS: 'notificaciones',
  REPORTS: 'reportes',
  HOLIDAYS: 'feriados',
  SCHEDULE_BLOCKS: 'bloqueos de horario',
  ROLES: 'roles',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Crear',
  READ: 'Ver',
  UPDATE: 'Editar',
  DELETE: 'Eliminar',
  MANAGE: 'Gestionar',
};

function buildCorePermissions(): PermissionDef[] {
  const permissions: PermissionDef[] = [];

  // Wildcard total
  permissions.push({
    action: 'MANAGE',
    subject: 'ALL',
    description: 'Acceso total a todos los recursos del sistema',
  });

  // CRUD por cada subject
  for (const subject of SUBJECTS) {
    for (const action of ACTIONS) {
      permissions.push({
        action,
        subject,
        description: `${ACTION_LABELS[action]} ${SUBJECT_LABELS[subject]}`,
      });
    }

    // MANAGE por subject
    permissions.push({
      action: 'MANAGE',
      subject,
      description: `${ACTION_LABELS['MANAGE']} ${SUBJECT_LABELS[subject]} (todas las acciones)`,
    });
  }

  return permissions;
}

/* ─── Definición de roles del sistema ─── */

interface SystemRoleDef {
  name: string;
  description: string;
  permissions: string[]; // formato 'ACTION:SUBJECT'
}

const SYSTEM_ROLES: SystemRoleDef[] = [
  {
    name: 'SUPER_ADMIN',
    description: 'Super administrador con acceso total al sistema',
    permissions: ['MANAGE:ALL'],
  },
  {
    name: 'ADMIN',
    description: 'Administrador de clínica',
    permissions: [
      'MANAGE:USERS',
      'MANAGE:DOCTORS',
      'MANAGE:PATIENTS',
      'MANAGE:APPOINTMENTS',
      'MANAGE:SCHEDULES',
      'MANAGE:AVAILABILITY',
      'MANAGE:SPECIALTIES',
      'MANAGE:CATEGORIES',
      'MANAGE:CLINICS',
      'MANAGE:CLINICAL_NOTES',
      'MANAGE:PRESCRIPTIONS',
      'MANAGE:MEDICAL_HISTORY',
      'MANAGE:NOTIFICATIONS',
      'MANAGE:REPORTS',
      'MANAGE:HOLIDAYS',
      'MANAGE:SCHEDULE_BLOCKS',
      'MANAGE:ROLES',
    ],
  },
  {
    name: 'DOCTOR',
    description: 'Médico con acceso a sus citas y pacientes',
    permissions: [
      'READ:APPOINTMENTS',
      'UPDATE:APPOINTMENTS',
      'READ:PATIENTS',
      'READ:SCHEDULES',
      'READ:AVAILABILITY',
      'READ:SPECIALTIES',
      'CREATE:CLINICAL_NOTES',
      'READ:CLINICAL_NOTES',
      'CREATE:PRESCRIPTIONS',
      'READ:PRESCRIPTIONS',
      'CREATE:MEDICAL_HISTORY',
      'READ:MEDICAL_HISTORY',
      'UPDATE:MEDICAL_HISTORY',
      'DELETE:MEDICAL_HISTORY',
      'READ:NOTIFICATIONS',
      'UPDATE:NOTIFICATIONS',
      'DELETE:NOTIFICATIONS',
    ],
  },
  {
    name: 'RECEPTIONIST',
    description: 'Recepcionista con acceso a la gestión de citas y pacientes',
    permissions: [
      'CREATE:PATIENTS',
      'READ:PATIENTS',
      'UPDATE:PATIENTS',
      'CREATE:APPOINTMENTS',
      'READ:APPOINTMENTS',
      'UPDATE:APPOINTMENTS',
      'READ:DOCTORS',
      'MANAGE:SCHEDULES',
      'MANAGE:AVAILABILITY',
      'READ:SPECIALTIES',
      'READ:CATEGORIES',
      'MANAGE:SCHEDULE_BLOCKS',
      'READ:NOTIFICATIONS',
      'UPDATE:NOTIFICATIONS',
      'DELETE:NOTIFICATIONS',
    ],
  },
  {
    name: 'PATIENT',
    description: 'Paciente con acceso a sus propias citas y perfil',
    permissions: [
      'READ:APPOINTMENTS',
      'CREATE:APPOINTMENTS',
      'UPDATE:APPOINTMENTS',
      'READ:DOCTORS',
      'READ:SPECIALTIES',
      'READ:CATEGORIES',
      'READ:CLINICS',
      'READ:SCHEDULES',
      'READ:PRESCRIPTIONS',
      'READ:NOTIFICATIONS',
      'UPDATE:NOTIFICATIONS',
      'DELETE:NOTIFICATIONS',
    ],
  },
];

/* ─── Ejecución ─── */

async function seedRbac() {
  console.log('🔐 Iniciando seed de RBAC...\n');

  // 1. Upsert permisos core
  const permissionDefs = buildCorePermissions();
  console.log(`   📋 Insertando ${permissionDefs.length} permisos...`);

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

  // 2. Upsert roles del sistema con permisos
  for (const roleDef of SYSTEM_ROLES) {
    console.log(`   🎭 Procesando rol: ${roleDef.name}`);

    const permissionIds = roleDef.permissions
      .map((key) => permissionMap.get(key))
      .filter((id): id is number => id !== undefined);

    // Buscar o crear rol
    let role = await prisma.roles.findFirst({
      where: { name: roleDef.name, isSystem: true },
    });

    if (!role) {
      role = await prisma.roles.create({
        data: {
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
          clinicId: null,
        },
      });
      console.log(`      ➕ Rol creado: ${roleDef.name}`);
    } else {
      await prisma.roles.update({
        where: { id: role.id },
        data: { description: roleDef.description },
      });
      console.log(`      ♻️  Rol actualizado: ${roleDef.name}`);
    }

    // Sincronizar permisos: borrar y recrear
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
      `      ✅ ${permissionIds.length} permisos asignados a ${roleDef.name}\n`,
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
