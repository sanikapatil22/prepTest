import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({ include: { college: true } });
  console.log("=== Users ===");
  for (const u of users) {
    console.log(`  ${u.role.padEnd(15)} | ${u.name.padEnd(20)} | ${u.email.padEnd(30)} | College: ${u.college?.name ?? "N/A"}`);
  }

  const colleges = await prisma.college.findMany();
  console.log("\n=== Colleges ===");
  for (const c of colleges) {
    console.log(`  ${c.name} (Code: ${c.code}, Active: ${c.isActive})`);
  }

  const drives = await prisma.placementDrive.findMany({ include: { college: true } });
  console.log("\n=== Placement Drives ===");
  for (const d of drives) {
    console.log(`  ${d.title} | Status: ${d.status} | College: ${d.college.name}`);
  }

  const tests = await prisma.test.findMany({
    include: { _count: { select: { questions: true, attempts: true } } },
  });
  console.log("\n=== Tests ===");
  for (const t of tests) {
    console.log(`  ${t.title} | Status: ${t.status} | Duration: ${t.durationMinutes}min | Questions: ${t._count.questions} | Attempts: ${t._count.attempts}`);
  }

  await prisma.$disconnect();
}

main();
