import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { tenantStorage } from './tenant-context.js';

// Staff-owned data: only records belonging to the current clinic are visible.
const STRICT_TENANT_MODELS = new Set([
  'Appointments',
  'Doctors',
  'Availability',
  'ClinicalNotes',
  'Prescriptions',
  'MedicalHistory',
]);

// Catalog data: global records (clinicId null) are visible to all tenants,
// clinic-specific records are only visible to that clinic.
const CATALOG_TENANT_MODELS = new Set([
  'Specialties',
  'Categories',
  'Schedules',
  'Holidays',
]);

type WhereArgs = { where?: Record<string, unknown> };

function injectTenantFilter(
  model: string,
  args: WhereArgs,
  clinicId: number,
): void {
  const existing = args.where ?? {};
  if (STRICT_TENANT_MODELS.has(model)) {
    args.where = { AND: [existing, { clinicId }] };
  } else if (CATALOG_TENANT_MODELS.has(model)) {
    args.where = {
      AND: [existing, { OR: [{ clinicId: null }, { clinicId }] }],
    };
  }
}

function withTenantFilter<A extends WhereArgs>(model: string, args: A): A {
  const clinicId = tenantStorage.getStore();
  if (clinicId) injectTenantFilter(model, args, clinicId);
  return args;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Cached extended client — built once on first access.
  private _tenantClient: PrismaClient | undefined;

  /**
   * Tenant-aware Prisma client.
   *
   * Use this instead of bare `prisma` in repository read queries that must be
   * scoped to the current clinic. Automatically injects clinicId into WHERE
   * clauses for reads (findMany, findFirst, count, etc.) and bulk mutations
   * (updateMany, deleteMany) based on the current request context.
   *
   * No filter is injected when clinicId is null/undefined in the current
   * request context (super-admin, patient, cron jobs, seeds).
   *
   * Note: $transaction callbacks receive a plain PrismaClient, so tenant
   * filtering does not apply inside them. Transactions are used for writes
   * which carry an explicit clinicId in their data objects.
   */
  get tenant(): PrismaClient {
    if (!this._tenantClient) {
      this._tenantClient = this.$extends({
        query: {
          $allModels: {
            async findMany({ model, args, query }) {
              return query(withTenantFilter(model, args as WhereArgs) as typeof args);
            },
            async findFirst({ model, args, query }) {
              return query(withTenantFilter(model, args as WhereArgs) as typeof args);
            },
            async findFirstOrThrow({ model, args, query }) {
              return query(withTenantFilter(model, args as WhereArgs) as typeof args);
            },
            async count({ model, args, query }) {
              return query(withTenantFilter(model, args as WhereArgs) as typeof args);
            },
            async updateMany({ model, args, query }) {
              return query(withTenantFilter(model, args as WhereArgs) as typeof args);
            },
            async deleteMany({ model, args, query }) {
              return query(withTenantFilter(model, args as WhereArgs) as typeof args);
            },
          },
        },
      }) as unknown as PrismaClient;
    }
    return this._tenantClient;
  }
}
