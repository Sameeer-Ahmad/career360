// Phase 2 verification: does the generated Prisma MongoDB client actually
// connect to the scratch replica set and perform a real write/read? A
// throwaway document only — deleted at the end of this script.
import { makeMongoClient } from "./lib/clients.mjs";

const mongo = makeMongoClient();

try {
  const user = await mongo.user.create({
    data: { name: "Connectivity Check", email: `connectivity-check-${Date.now()}@example.test` },
  });
  console.log("[connectivity] Prisma MongoDB client created a document:", user.id);

  const found = await mongo.user.findUnique({ where: { id: user.id } });
  console.log("[connectivity] Read back ok:", found?.id === user.id);

  await mongo.user.delete({ where: { id: user.id } });
  console.log("[connectivity] Cleanup ok — throwaway document removed.");

  console.log("[connectivity] PASS — Prisma MongoDB client + replica set both working.");
} finally {
  await mongo.$disconnect();
}
