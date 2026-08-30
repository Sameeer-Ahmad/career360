// Shared Prisma client factories for all migration-infrastructure scripts.
//
// mysqlClient: an ISOLATED MySQL client generated from the frozen snapshot
// at mongo-migration/prisma-mysql-snapshot/schema.prisma, reading
// DATABASE_URL — the same MySQL connection the application used before
// cutover. Deliberately NOT imported from "@prisma/client": once the real
// prisma/schema.prisma is converted to MongoDB, that package IS the Mongo
// client, so migration/rollback tooling needs its own independent MySQL
// client to keep working. Every script that touches it does so READ-ONLY.
//
// mongoClient: the CANDIDATE migration client (mongo-migration/generated/client
// — the same validated schema used for the scratch dry run), targeting
// EITHER the scratch database (career360_migration_scratch, via
// MONGODB_MIGRATION_SCRATCH_URL) OR the real application database
// (career360, via MONGODB_DATABASE_URL), selected explicitly by the
// `target` argument — never inferred, never defaulted to "app" silently.
import "dotenv/config";
import { PrismaClient as MySqlPrismaClient } from "../../generated/mysql-client/index.js";
import { PrismaClient as MongoPrismaClient } from "../../generated/client/index.js";

export function makeMySqlClient() {
  return new MySqlPrismaClient();
}

/**
 * @param {"scratch" | "app"} target
 */
export function makeMongoClient(target = "scratch") {
  if (target === "scratch") {
    const url = process.env.MONGODB_MIGRATION_SCRATCH_URL;
    if (!url) throw new Error("MONGODB_MIGRATION_SCRATCH_URL is not set — refusing to run.");
    if (!url.includes("career360_migration_scratch")) {
      throw new Error(
        `MONGODB_MIGRATION_SCRATCH_URL does not point at career360_migration_scratch (got: ${url}) — refusing to run against a non-scratch database.`,
      );
    }
    // The generated client's connection resolution is baked to read
    // MONGODB_MIGRATION_SCRATCH_URL (per the candidate schema's `url =
    // env(...)`) — already correct for this branch, no override needed.
    return new MongoPrismaClient();
  }

  if (target === "app") {
    const url = process.env.MONGODB_DATABASE_URL;
    if (!url) throw new Error("MONGODB_DATABASE_URL is not set — refusing to run.");
    if (!/\/career360(\?|$)/.test(url) || url.includes("career360_migration_scratch")) {
      throw new Error(
        `MONGODB_DATABASE_URL does not point at the career360 application database (got: ${url}) — refusing to run.`,
      );
    }
    // The generated client only knows how to read MONGODB_MIGRATION_SCRATCH_URL
    // (it's baked in at `prisma generate` time from the schema's `url =
    // env(...)` call) — alias it in-process, for this call only, so the
    // SAME validated client/schema can target the real app database
    // without regenerating a near-duplicate client. This never touches
    // .env or any other process.
    process.env.MONGODB_MIGRATION_SCRATCH_URL = url;
    return new MongoPrismaClient();
  }

  throw new Error(`Unknown mongo client target: "${target}" — expected "scratch" or "app".`);
}
