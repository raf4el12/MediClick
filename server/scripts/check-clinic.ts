import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.users.findUnique({
    where: { email: 'doctor@mediclick.com' },
    include: {
        profiles: {
            include: {
                doctor: true
            }
        }
    }
  });

  console.log('User clinicId:', user?.clinicId);
  const doctor = user?.profiles[0]?.doctor;
  console.log('Doctor clinicId:', doctor?.clinicId);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
