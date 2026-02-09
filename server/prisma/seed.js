const pg = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  const hashedPassword = await bcrypt.hash('123456', 10);

  // Check if admin already exists
  const existing = await pool.query(
    'SELECT id, email, role FROM "Users" WHERE email = $1',
    ['admin@mediclick.com']
  );

  if (existing.rows.length > 0) {
    console.log('Admin already exists:', existing.rows[0]);
    await pool.end();
    return;
  }

  const result = await pool.query(
    `INSERT INTO "Users" (name, email, password, role, "isActive", "validateEmail", deleted, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id, email, role`,
    ['admin', 'admin@mediclick.com', hashedPassword, 'ADMIN', true, true, false]
  );

  console.log('Admin created:', result.rows[0]);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
