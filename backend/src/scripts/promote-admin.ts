// One-shot promotion of an existing user to the ADMIN role. There is no
// admin-management UI yet (that's the follow-up dashboard ticket), so the
// very first admin is created this way — see docs/backend/ADMIN_ROLE.md.
//   npx tsx src/scripts/promote-admin.ts --email=someone@example.com
import { parseArgs } from "node:util";
import { prisma } from "../shared/database/prisma.js";

const USAGE = `Usage: tsx src/scripts/promote-admin.ts --email=<email>

Promotes an existing user to the ADMIN role. The user must already have
registered a normal account through POST /auth/register.

Options:
  --email=EMAIL  Email of the account to promote
  -h, --help     Show this help`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help || !values.email) {
    console.log(USAGE);
    if (!values.help) process.exitCode = 1;
    return;
  }

  const user = await prisma.user.update({
    where: { email: values.email },
    data: { role: "ADMIN" },
  });

  console.log(`[promote-admin] ${user.email} is now ADMIN.`);
}

main()
  .catch((error: unknown) => {
    console.error("[promote-admin] Failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
