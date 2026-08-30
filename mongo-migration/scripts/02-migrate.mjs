// Phase 4 — MySQL -> MongoDB dry-run migration.
//
// SOURCE: the application's real MySQL Prisma client (READ-ONLY — every
// call against `mysql` in this file is a find/count; nothing here ever
// writes, updates, or deletes MySQL data).
// TARGET: the candidate MongoDB Prisma client, writing to the scratch
// database (career360_migration_scratch) only.
//
// Implements the approved two-pass algorithm exactly:
//   1. Snapshot MySQL counts
//   2. Users              (independent)
//   3. Companies          (independent)
//   4. Accounts           (userId mapped)
//   5. Sessions           (userId mapped)
//   6. Applications       (userId + companyId mapped)
//   7. Documents pass 1   (userId + applicationId mapped; source/master left null)
//   8. Documents pass 2   (source/masterDocumentId resolved via the Document id-map)
//   9. Timestamps copied verbatim in every create() above
//  10. Enums/nulls copied verbatim (no transformation) in every create() above
//
// Resumable: every id-map entry is persisted to `_migration_id_map` as it's
// created (see lib/id-map.mjs); a re-run reloads what's already mapped and
// skips re-creating those records rather than erroring on a duplicate.
//
// Fails loudly (throws, stops the whole run) rather than silently skipping
// on: a missing referenced user/company/application/source/master, an
// ownership mismatch between a document and its source/application, a
// master reference that isn't actually a MASTER document, a duplicate
// unique value, or an unexpected count mismatch. See assertOrFail() and
// every call site below.
import { writeFileSync } from "node:fs";
import { makeMySqlClient, makeMongoClient } from "./lib/clients.mjs";
import { loadExistingMap, persistMapEntry } from "./lib/id-map.mjs";

// Usage: node 02-migrate.mjs [scratch|app]  (defaults to scratch — the real
// application database is only ever targeted when explicitly requested.)
const target = process.argv[2] === "app" ? "app" : "scratch";
console.log(`[migrate] Target: ${target === "app" ? "REAL application database (career360)" : "scratch database (career360_migration_scratch)"}`);

const mysql = makeMySqlClient();
const mongo = makeMongoClient(target);

const report = {
  startedAt: new Date().toISOString(),
  finishedAt: null,
  snapshot: null,
  steps: {},
  warnings: [],
  errors: [],
  failedLoudly: false,
};

function assertOrFail(condition, message, detail) {
  if (condition) return;
  const entry = { message, detail };
  report.errors.push(entry);
  report.failedLoudly = true;
  writeReport();
  throw new Error(`[MIGRATION FAILURE] ${message} — ${JSON.stringify(detail)}`);
}

function writeReport() {
  report.finishedAt = new Date().toISOString();
  writeFileSync(
    new URL("../reports/migration-report.json", import.meta.url),
    JSON.stringify(report, null, 2),
  );
}

async function createOrFailOnDuplicate(model, data, context) {
  try {
    return await model.create({ data });
  } catch (error) {
    if (error?.code === "P2002") {
      assertOrFail(false, "Duplicate unique value encountered during migration", {
        ...context,
        prismaCode: error.code,
        meta: error.meta,
      });
    }
    throw error;
  }
}

// ---------------------------------------------------------------------
// STEP 1 — Snapshot
// ---------------------------------------------------------------------
async function snapshot() {
  const counts = {
    User: await mysql.user.count(),
    Account: await mysql.account.count(),
    Session: await mysql.session.count(),
    Company: await mysql.company.count(),
    Application: await mysql.application.count(),
    Document: await mysql.document.count(),
  };
  report.snapshot = counts;
  console.log("[1/8] MySQL snapshot:", counts);
  return counts;
}

// ---------------------------------------------------------------------
// STEP 2 — Users (independent)
// ---------------------------------------------------------------------
async function migrateUsers() {
  const idMap = await loadExistingMap(mongo, "User");
  const resumedCount = idMap.size;
  const users = await mysql.user.findMany();

  let created = 0;
  for (const u of users) {
    if (idMap.has(String(u.id))) continue;
    const doc = await createOrFailOnDuplicate(
      mongo.user,
      {
        name: u.name,
        email: u.email,
        emailVerified: u.emailVerified,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      },
      { model: "User", mysqlId: u.id, field: "email", value: u.email },
    );
    idMap.set(String(u.id), doc.id);
    await persistMapEntry(mongo, "User", u.id, doc.id);
    created++;
  }

  assertOrFail(
    idMap.size === users.length,
    "User migration count mismatch",
    { mysqlCount: users.length, mappedCount: idMap.size },
  );

  report.steps.users = { mysqlCount: users.length, created, resumedFromMap: resumedCount };
  console.log(`[2/8] Users: ${users.length} in MySQL, ${created} created, ${resumedCount} already mapped.`);
  return idMap;
}

// ---------------------------------------------------------------------
// STEP 3 — Companies (independent)
// ---------------------------------------------------------------------
async function migrateCompanies() {
  const idMap = await loadExistingMap(mongo, "Company");
  const resumedCount = idMap.size;
  const companies = await mysql.company.findMany();

  let created = 0;
  for (const c of companies) {
    if (idMap.has(String(c.id))) continue;
    const doc = await createOrFailOnDuplicate(
      mongo.company,
      {
        name: c.name,
        website: c.website,
        location: c.location,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      },
      { model: "Company", mysqlId: c.id },
    );
    idMap.set(String(c.id), doc.id);
    await persistMapEntry(mongo, "Company", c.id, doc.id);
    created++;
  }

  assertOrFail(
    idMap.size === companies.length,
    "Company migration count mismatch",
    { mysqlCount: companies.length, mappedCount: idMap.size },
  );

  report.steps.companies = { mysqlCount: companies.length, created, resumedFromMap: resumedCount };
  console.log(`[3/8] Companies: ${companies.length} in MySQL, ${created} created, ${resumedCount} already mapped.`);
  return idMap;
}

// ---------------------------------------------------------------------
// STEP 4 — Accounts (userId mapped)
// ---------------------------------------------------------------------
async function migrateAccounts(userIdMap) {
  const idMap = await loadExistingMap(mongo, "Account");
  const resumedCount = idMap.size;
  const accounts = await mysql.account.findMany();

  let created = 0;
  for (const a of accounts) {
    if (idMap.has(String(a.id))) continue;
    const mappedUserId = userIdMap.get(String(a.userId));
    assertOrFail(mappedUserId !== undefined, "Account references a user that was not migrated", {
      accountId: a.id,
      mysqlUserId: a.userId,
    });

    const doc = await createOrFailOnDuplicate(
      mongo.account,
      {
        userId: mappedUserId,
        type: a.type,
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        refresh_token: a.refresh_token,
        access_token: a.access_token,
        expires_at: a.expires_at,
        token_type: a.token_type,
        scope: a.scope,
        id_token: a.id_token,
        session_state: a.session_state,
      },
      { model: "Account", mysqlId: a.id, field: "[provider, providerAccountId]", value: [a.provider, a.providerAccountId] },
    );
    idMap.set(String(a.id), doc.id);
    await persistMapEntry(mongo, "Account", a.id, doc.id);
    created++;
  }

  assertOrFail(idMap.size === accounts.length, "Account migration count mismatch", {
    mysqlCount: accounts.length,
    mappedCount: idMap.size,
  });

  report.steps.accounts = { mysqlCount: accounts.length, created, resumedFromMap: resumedCount };
  console.log(`[4/8] Accounts: ${accounts.length} in MySQL, ${created} created, ${resumedCount} already mapped.`);
}

// ---------------------------------------------------------------------
// STEP 5 — Sessions (userId mapped)
// ---------------------------------------------------------------------
async function migrateSessions(userIdMap) {
  const idMap = await loadExistingMap(mongo, "Session");
  const resumedCount = idMap.size;
  const sessions = await mysql.session.findMany();

  let created = 0;
  for (const s of sessions) {
    if (idMap.has(String(s.id))) continue;
    const mappedUserId = userIdMap.get(String(s.userId));
    assertOrFail(mappedUserId !== undefined, "Session references a user that was not migrated", {
      sessionId: s.id,
      mysqlUserId: s.userId,
    });

    const doc = await createOrFailOnDuplicate(
      mongo.session,
      { userId: mappedUserId, sessionToken: s.sessionToken, expires: s.expires },
      { model: "Session", mysqlId: s.id, field: "sessionToken", value: s.sessionToken },
    );
    idMap.set(String(s.id), doc.id);
    await persistMapEntry(mongo, "Session", s.id, doc.id);
    created++;
  }

  assertOrFail(idMap.size === sessions.length, "Session migration count mismatch", {
    mysqlCount: sessions.length,
    mappedCount: idMap.size,
  });

  report.steps.sessions = { mysqlCount: sessions.length, created, resumedFromMap: resumedCount };
  console.log(`[5/8] Sessions: ${sessions.length} in MySQL, ${created} created, ${resumedCount} already mapped.`);
}

// ---------------------------------------------------------------------
// STEP 6 — Applications (userId + companyId mapped)
// ---------------------------------------------------------------------
async function migrateApplications(userIdMap, companyIdMap) {
  const idMap = await loadExistingMap(mongo, "Application");
  const resumedCount = idMap.size;
  const applications = await mysql.application.findMany();

  // Kept for Document pass-1's ownership check (applicationId -> owning userId)
  // without a second MySQL round trip.
  const mysqlApplicationOwnerById = new Map();
  for (const app of applications) mysqlApplicationOwnerById.set(app.id, app.userId);

  let created = 0;
  for (const a of applications) {
    mysqlApplicationOwnerById.set(a.id, a.userId);
    if (idMap.has(String(a.id))) continue;

    const mappedUserId = userIdMap.get(String(a.userId));
    assertOrFail(mappedUserId !== undefined, "Application references a user that was not migrated", {
      applicationId: a.id,
      mysqlUserId: a.userId,
    });
    const mappedCompanyId = companyIdMap.get(String(a.companyId));
    assertOrFail(mappedCompanyId !== undefined, "Application references a company that was not migrated", {
      applicationId: a.id,
      mysqlCompanyId: a.companyId,
    });

    const doc = await createOrFailOnDuplicate(
      mongo.application,
      {
        userId: mappedUserId,
        companyId: mappedCompanyId,
        jobTitle: a.jobTitle,
        jobUrl: a.jobUrl,
        location: a.location,
        salaryMin: a.salaryMin,
        salaryMax: a.salaryMax,
        salaryCurrency: a.salaryCurrency,
        employmentType: a.employmentType,
        appliedAt: a.appliedAt,
        status: a.status,
        jobDescription: a.jobDescription,
        priority: a.priority,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      },
      { model: "Application", mysqlId: a.id },
    );
    idMap.set(String(a.id), doc.id);
    await persistMapEntry(mongo, "Application", a.id, doc.id);
    created++;
  }

  assertOrFail(idMap.size === applications.length, "Application migration count mismatch", {
    mysqlCount: applications.length,
    mappedCount: idMap.size,
  });

  report.steps.applications = { mysqlCount: applications.length, created, resumedFromMap: resumedCount };
  console.log(`[6/8] Applications: ${applications.length} in MySQL, ${created} created, ${resumedCount} already mapped.`);
  return { idMap, mysqlApplicationOwnerById };
}

// ---------------------------------------------------------------------
// STEP 7 — Documents pass 1 (userId + applicationId mapped; source/master left null)
// ---------------------------------------------------------------------
async function migrateDocumentsPass1(userIdMap, applicationIdMap, mysqlApplicationOwnerById) {
  const idMap = await loadExistingMap(mongo, "Document");
  const resumedCount = idMap.size;
  const documents = await mysql.document.findMany();

  // Kept for pass 2's ownership/role checks without a second MySQL round trip.
  const mysqlDocumentOwnerById = new Map();
  const mysqlDocumentRoleById = new Map();
  for (const d of documents) {
    mysqlDocumentOwnerById.set(d.id, d.userId);
    mysqlDocumentRoleById.set(d.id, d.resumeRole);
  }

  let created = 0;
  for (const d of documents) {
    if (idMap.has(String(d.id))) continue;

    const mappedUserId = userIdMap.get(String(d.userId));
    assertOrFail(mappedUserId !== undefined, "Document references a user that was not migrated", {
      documentId: d.id,
      mysqlUserId: d.userId,
    });

    let mappedApplicationId = null;
    if (d.applicationId != null) {
      mappedApplicationId = applicationIdMap.get(String(d.applicationId));
      assertOrFail(mappedApplicationId !== undefined, "Document references an application that was not migrated", {
        documentId: d.id,
        mysqlApplicationId: d.applicationId,
      });
      const applicationOwnerId = mysqlApplicationOwnerById.get(d.applicationId);
      assertOrFail(
        applicationOwnerId === d.userId,
        "Document's application reference belongs to a different user (cross-user integrity violation in source data)",
        { documentId: d.id, documentUserId: d.userId, applicationId: d.applicationId, applicationOwnerId },
      );
    }

    const doc = await createOrFailOnDuplicate(
      mongo.document,
      {
        userId: mappedUserId,
        type: d.type,
        contentFormat: d.contentFormat,
        resumeRole: d.resumeRole,
        title: d.title,
        content: d.content,
        applicationId: mappedApplicationId,
        // Left unset here on purpose — resolved in pass 2 once every
        // Document has a mapped id, regardless of migration order.
        sourceDocumentId: null,
        masterDocumentId: null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      },
      { model: "Document", mysqlId: d.id },
    );
    idMap.set(String(d.id), doc.id);
    await persistMapEntry(mongo, "Document", d.id, doc.id);
    created++;
  }

  assertOrFail(idMap.size === documents.length, "Document pass-1 migration count mismatch", {
    mysqlCount: documents.length,
    mappedCount: idMap.size,
  });

  report.steps.documentsPass1 = { mysqlCount: documents.length, created, resumedFromMap: resumedCount };
  console.log(`[7/8] Documents (pass 1): ${documents.length} in MySQL, ${created} created, ${resumedCount} already mapped.`);
  return { idMap, mysqlDocumentOwnerById, mysqlDocumentRoleById };
}

// ---------------------------------------------------------------------
// STEP 8 — Documents pass 2 (resolve sourceDocumentId / masterDocumentId)
// ---------------------------------------------------------------------
async function migrateDocumentsPass2(documentIdMap, mysqlDocumentOwnerById, mysqlDocumentRoleById) {
  const documents = await mysql.document.findMany({
    where: { OR: [{ sourceDocumentId: { not: null } }, { masterDocumentId: { not: null } }] },
  });

  let resolved = 0;
  let alreadyResolved = 0;
  for (const d of documents) {
    const mongoDocId = documentIdMap.get(String(d.id));
    assertOrFail(mongoDocId !== undefined, "Document missing from pass-1 id-map during pass 2 (should be impossible)", {
      documentId: d.id,
    });

    const data = {};

    if (d.sourceDocumentId != null) {
      const mappedSourceId = documentIdMap.get(String(d.sourceDocumentId));
      assertOrFail(mappedSourceId !== undefined, "Document's sourceDocumentId does not exist", {
        documentId: d.id,
        mysqlSourceDocumentId: d.sourceDocumentId,
      });
      const sourceOwnerId = mysqlDocumentOwnerById.get(d.sourceDocumentId);
      assertOrFail(
        sourceOwnerId === d.userId,
        "Document belongs to a different user than its source document",
        { documentId: d.id, documentUserId: d.userId, sourceDocumentId: d.sourceDocumentId, sourceOwnerId },
      );
      data.sourceDocumentId = mappedSourceId;
    }

    if (d.masterDocumentId != null) {
      const mappedMasterId = documentIdMap.get(String(d.masterDocumentId));
      assertOrFail(mappedMasterId !== undefined, "Document's masterDocumentId does not exist", {
        documentId: d.id,
        mysqlMasterDocumentId: d.masterDocumentId,
      });
      const masterRole = mysqlDocumentRoleById.get(d.masterDocumentId);
      assertOrFail(
        masterRole === "MASTER",
        "Document's masterDocumentId does not point to a document with resumeRole = MASTER",
        { documentId: d.id, mysqlMasterDocumentId: d.masterDocumentId, masterRole },
      );
      const masterOwnerId = mysqlDocumentOwnerById.get(d.masterDocumentId);
      assertOrFail(
        masterOwnerId === d.userId,
        "Document's masterDocumentId belongs to a different user (cross-user integrity violation in source data)",
        { documentId: d.id, documentUserId: d.userId, masterDocumentId: d.masterDocumentId, masterOwnerId },
      );
      data.masterDocumentId = mappedMasterId;
    }

    const current = await mongo.document.findUnique({ where: { id: mongoDocId }, select: { sourceDocumentId: true, masterDocumentId: true } });
    const needsSource = data.sourceDocumentId !== undefined && current.sourceDocumentId !== data.sourceDocumentId;
    const needsMaster = data.masterDocumentId !== undefined && current.masterDocumentId !== data.masterDocumentId;
    if (!needsSource && !needsMaster) {
      alreadyResolved++;
      continue;
    }

    // Prisma's @updatedAt auto-touches this field on any update() call —
    // without this explicit override, resolving source/master references
    // in pass 2 would silently overwrite the updatedAt value pass 1
    // already migrated correctly from MySQL. (Caught by validation check
    // #11 — content integrity — during the dry run.)
    await mongo.document.update({ where: { id: mongoDocId }, data: { ...data, updatedAt: d.updatedAt } });
    resolved++;
  }

  report.steps.documentsPass2 = {
    documentsWithSourceOrMaster: documents.length,
    resolved,
    alreadyResolved,
  };
  console.log(`[8/8] Documents (pass 2): ${documents.length} with source/master refs, ${resolved} resolved, ${alreadyResolved} already resolved.`);
}

try {
  const mysqlCounts = await snapshot();
  const userIdMap = await migrateUsers();
  const companyIdMap = await migrateCompanies();
  await migrateAccounts(userIdMap);
  await migrateSessions(userIdMap);
  const { idMap: applicationIdMap, mysqlApplicationOwnerById } = await migrateApplications(userIdMap, companyIdMap);
  const { idMap: documentIdMap, mysqlDocumentOwnerById, mysqlDocumentRoleById } = await migrateDocumentsPass1(
    userIdMap,
    applicationIdMap,
    mysqlApplicationOwnerById,
  );
  await migrateDocumentsPass2(documentIdMap, mysqlDocumentOwnerById, mysqlDocumentRoleById);

  const mongoCounts = {
    User: await mongo.user.count(),
    Account: await mongo.account.count(),
    Session: await mongo.session.count(),
    Company: await mongo.company.count(),
    Application: await mongo.application.count(),
    Document: await mongo.document.count(),
  };
  report.mongoCounts = mongoCounts;

  for (const model of Object.keys(mysqlCounts)) {
    assertOrFail(mysqlCounts[model] === mongoCounts[model], `Final record count mismatch for ${model}`, {
      model,
      mysqlCount: mysqlCounts[model],
      mongoCount: mongoCounts[model],
    });
  }

  console.log("\n[migrate] Final counts match MySQL exactly:", mongoCounts);
  console.log("[migrate] Migration completed with zero errors.");
} catch (error) {
  report.failedLoudly = true;
  if (!report.errors.some((e) => e.message && String(error).includes(e.message))) {
    report.errors.push({ message: String(error?.message ?? error) });
  }
  console.error("\n[migrate] MIGRATION FAILED:", error?.message ?? error);
  throw error;
} finally {
  writeReport();
  console.log("[migrate] Report written to mongo-migration/reports/migration-report.json");
  await mysql.$disconnect();
  await mongo.$disconnect();
}
