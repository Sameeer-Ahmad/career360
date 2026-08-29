// Persistent MySQL-id -> MongoDB-ObjectId mapping, stored in the scratch
// database's `_migration_id_map` collection (not a Prisma model — written
// via $runCommandRaw, which the MongoDB connector exposes for exactly this
// kind of ad hoc collection). Makes the migration resumable: a re-run
// reloads what's already mapped and skips re-creating those records.
export async function loadExistingMap(mongo, model) {
  const result = await mongo.$runCommandRaw({
    find: "_migration_id_map",
    filter: { model },
    limit: 1000000,
  });
  const batch = result?.cursor?.firstBatch ?? [];
  const map = new Map();
  for (const doc of batch) map.set(String(doc.mysqlId), doc.mongoId);
  return map;
}

export async function persistMapEntry(mongo, model, mysqlId, mongoId) {
  await mongo.$runCommandRaw({
    insert: "_migration_id_map",
    documents: [
      { model, mysqlId: String(mysqlId), mongoId, migratedAt: new Date().toISOString() },
    ],
  });
}

export async function countMapEntries(mongo, model) {
  const result = await mongo.$runCommandRaw({ count: "_migration_id_map", query: { model } });
  return result?.n ?? 0;
}
