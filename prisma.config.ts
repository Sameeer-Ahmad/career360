// Config for the active application schema (prisma/schema.prisma,
// MongoDB as of the MySQL -> MongoDB cutover). No `migrations` block —
// MongoDB doesn't use Prisma's relational migration workflow; schema
// changes are applied with `prisma db push`, not `migrate dev/deploy`.
//
// DATABASE_URL (MySQL) is intentionally NOT referenced here anymore — it
// stays set in .env for the migration/rollback tooling under
// mongo-migration/, which has its own isolated config and Prisma client.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["MONGODB_DATABASE_URL"]!,
  },
});
