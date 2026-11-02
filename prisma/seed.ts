// Demo seed — synthetic data only, no real student information.
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = "demo-it";
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: { name: "Demo Institute of Technology", slug },
  });
  await prisma.tenantSetting.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, minCgpaDefault: 6.0 },
  });

  const admin = await prisma.user.upsert({
    where: { email_tenantId: { email: "admin@demo.edu", tenantId: tenant.id } },
    update: {},
    create: {
      email: "admin@demo.edu",
      name: "Demo Admin",
      passwordHash,
      role: Role.ADMIN,
      tenantId: tenant.id,
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email_tenantId: { email: "student@demo.edu", tenantId: tenant.id } },
    update: {},
    create: {
      email: "student@demo.edu",
      name: "Demo Student",
      passwordHash,
      role: Role.STUDENT,
      tenantId: tenant.id,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      tenantId: tenant.id,
      rollNumber: "21CS001",
      department: "CSE",
      batch: 2026,
      cgpa: 8.4,
      skills: ["TypeScript", "React", "Node.js"],
    },
  });

  const company = await prisma.company.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Acme Technologies" } },
    update: {},
    create: { tenantId: tenant.id, name: "Acme Technologies", industry: "Software" },
  });

  await prisma.jobPosting.upsert({
    where: { id: "seed-job-1" },
    update: {},
    create: {
      id: "seed-job-1",
      tenantId: tenant.id,
      companyId: company.id,
      title: "Software Development Engineer",
      description: "Build and ship features for our flagship SaaS product used by thousands of colleges.",
      jobType: "FULL_TIME",
      status: "OPEN",
      location: "Bengaluru",
      packageCTC: 12.0,
      minCgpa: 6.5,
      eligibleBatches: [2026],
      eligibleDepts: ["CSE", "ECE", "IT"],
      skillsRequired: ["TypeScript", "React"],
    },
  });

  console.log("Seeded demo tenant:", slug, "| admin: admin@demo.edu | student: student@demo.edu (password: Password123!)");
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
