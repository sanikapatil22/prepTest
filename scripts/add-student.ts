/**
 * Add a student to a college.
 *
 * Usage:
 *   npx tsx scripts/add-student.ts
 *   npx tsx scripts/add-student.ts --name "Jane Doe" --email jane@example.com --password secret123 --college DEMO2026
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { hashPassword } from "better-auth/crypto";
import { parseArgs } from "node:util";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const { values } = parseArgs({
  options: {
    name: { type: "string", default: "Test Student" },
    email: { type: "string", default: "student@demo.com" },
    password: { type: "string", default: "student123456" },
    college: { type: "string", default: "DEMO2026" },
  },
  strict: false,
});

async function main() {
  const { name, email, password, college: collegeCode } = values as {
    name: string;
    email: string;
    password: string;
    college: string;
  };

  // Find the college
  const college = await prisma.college.findUnique({
    where: { code: collegeCode },
  });

  if (!college) {
    console.error(`College with code "${collegeCode}" not found.`);
    const colleges = await prisma.college.findMany({
      select: { code: true, name: true },
    });
    if (colleges.length > 0) {
      console.log("\nAvailable colleges:");
      colleges.forEach((c) => console.log(`  ${c.code} — ${c.name}`));
    }
    process.exit(1);
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User with email "${email}" already exists (id: ${existing.id}, role: ${existing.role}).`);
    process.exit(0);
  }

  // Create user + credential account in a transaction
  const hashed = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        role: "STUDENT",
        collegeId: college.id,
      },
    });

    await tx.account.create({
      data: {
        userId: created.id,
        accountId: created.id,
        providerId: "credential",
        password: hashed,
      },
    });

    return created;
  });

  console.log("\nStudent created successfully!");
  console.log("========================================");
  console.log(`  Name:    ${user.name}`);
  console.log(`  Email:   ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  College: ${college.name} (${college.code})`);
  console.log(`  User ID: ${user.id}`);
  console.log("========================================");
}

main()
  .catch((e) => {
    console.error("Error:", e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
