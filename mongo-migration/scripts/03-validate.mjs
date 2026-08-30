// Phase 5 — full post-migration validation, per the approved design.
// Reads MySQL (read-only) and the scratch MongoDB database, cross-checking
// every invariant the migration is supposed to preserve. Never modifies
// MySQL. Test #10 (unique constraints) performs one throwaway duplicate
// insert attempt against Mongo only, cleaned up immediately.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { makeMySqlClient, makeMongoClient } from "./lib/clients.mjs";
import { loadExistingMap } from "./lib/id-map.mjs";

// Usage: node 03-validate.mjs [scratch|app]  (defaults to scratch)
const target = process.argv[2] === "app" ? "app" : "scratch";
console.log(`[validate] Target: ${target === "app" ? "REAL application database (career360)" : "scratch database (career360_migration_scratch)"}`);

const mysql = makeMySqlClient();
const mongo = makeMongoClient(target);

const checks = [];
function check(name, passed, detail) {
  checks.push({ name, passed, detail });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${name}`);
  if (!passed) console.log("       ", JSON.stringify(detail));
}

function sha256(value) {
  return createHash("sha256").update(value ?? "", "utf8").digest("hex");
}

function toIso(date) {
  return date instanceof Date ? date.toISOString() : date === null || date === undefined ? null : new Date(date).toISOString();
}

const userMap = await loadExistingMap(mongo, "User");
const applicationMap = await loadExistingMap(mongo, "Application");
const documentMap = await loadExistingMap(mongo, "Document");

// -----------------------------------------------------------------------
// 1. Per-model record counts
// -----------------------------------------------------------------------
async function checkRecordCounts() {
  const models = ["user", "account", "session", "company", "application", "document"];
  const mysqlCounts = {};
  const mongoCounts = {};
  for (const m of models) {
    mysqlCounts[m] = await mysql[m].count();
    mongoCounts[m] = await mongo[m].count();
  }
  const allMatch = models.every((m) => mysqlCounts[m] === mongoCounts[m]);
  check("1. Per-model record counts match", allMatch, { mysqlCounts, mongoCounts });
  return { mysqlCounts, mongoCounts };
}

// -----------------------------------------------------------------------
// 2. Application ownership
// -----------------------------------------------------------------------
async function checkApplicationOwnership() {
  const mysqlApplications = await mysql.application.findMany({ select: { id: true, userId: true } });
  const mismatches = [];
  for (const a of mysqlApplications) {
    const mongoAppId = applicationMap.get(String(a.id));
    const expectedMongoUserId = userMap.get(String(a.userId));
    if (!mongoAppId || !expectedMongoUserId) {
      mismatches.push({ mysqlApplicationId: a.id, reason: "missing id-map entry" });
      continue;
    }
    const mongoApp = await mongo.application.findUnique({ where: { id: mongoAppId }, select: { userId: true } });
    if (mongoApp?.userId !== expectedMongoUserId) {
      mismatches.push({ mysqlApplicationId: a.id, expectedMongoUserId, actualMongoUserId: mongoApp?.userId });
    }
  }
  check("2. Every Application.userId resolves to the correctly-migrated User", mismatches.length === 0, {
    checked: mysqlApplications.length,
    mismatches,
  });
}

// -----------------------------------------------------------------------
// 3. Document ownership
// -----------------------------------------------------------------------
async function checkDocumentOwnership() {
  const mysqlDocuments = await mysql.document.findMany({ select: { id: true, userId: true } });
  const mismatches = [];
  for (const d of mysqlDocuments) {
    const mongoDocId = documentMap.get(String(d.id));
    const expectedMongoUserId = userMap.get(String(d.userId));
    if (!mongoDocId || !expectedMongoUserId) {
      mismatches.push({ mysqlDocumentId: d.id, reason: "missing id-map entry" });
      continue;
    }
    const mongoDoc = await mongo.document.findUnique({ where: { id: mongoDocId }, select: { userId: true } });
    if (mongoDoc?.userId !== expectedMongoUserId) {
      mismatches.push({ mysqlDocumentId: d.id, expectedMongoUserId, actualMongoUserId: mongoDoc?.userId });
    }
  }
  check("3. Every Document.userId resolves to the correctly-migrated User", mismatches.length === 0, {
    checked: mysqlDocuments.length,
    mismatches,
  });
}

// -----------------------------------------------------------------------
// 4. Source document chains
// -----------------------------------------------------------------------
async function checkSourceDocumentChains() {
  const mysqlDocuments = await mysql.document.findMany({ where: { sourceDocumentId: { not: null } } });
  const problems = [];
  for (const d of mysqlDocuments) {
    const mongoDocId = documentMap.get(String(d.id));
    const mongoSourceId = documentMap.get(String(d.sourceDocumentId));
    if (!mongoDocId || !mongoSourceId) {
      problems.push({ documentId: d.id, reason: "missing id-map entry for document or source" });
      continue;
    }
    const [mongoDoc, mongoSource] = await Promise.all([
      mongo.document.findUnique({ where: { id: mongoDocId }, select: { sourceDocumentId: true, userId: true } }),
      mongo.document.findUnique({ where: { id: mongoSourceId }, select: { id: true, userId: true } }),
    ]);
    if (!mongoSource) {
      problems.push({ documentId: d.id, reason: "source document does not exist in Mongo" });
      continue;
    }
    if (mongoDoc?.sourceDocumentId !== mongoSourceId) {
      problems.push({ documentId: d.id, reason: "sourceDocumentId not correctly resolved", expected: mongoSourceId, actual: mongoDoc?.sourceDocumentId });
      continue;
    }
    if (mongoDoc.userId !== mongoSource.userId) {
      problems.push({ documentId: d.id, reason: "document and its source belong to different users", documentUserId: mongoDoc.userId, sourceUserId: mongoSource.userId });
    }
  }
  check("4. Source document chains intact (target exists, source exists, same user)", problems.length === 0, {
    checked: mysqlDocuments.length,
    problems,
  });
}

// -----------------------------------------------------------------------
// 5. Master references
// -----------------------------------------------------------------------
async function checkMasterReferences() {
  const mysqlDocuments = await mysql.document.findMany({ where: { masterDocumentId: { not: null } } });
  const problems = [];
  for (const d of mysqlDocuments) {
    const mongoDocId = documentMap.get(String(d.id));
    const mongoMasterId = documentMap.get(String(d.masterDocumentId));
    if (!mongoDocId || !mongoMasterId) {
      problems.push({ documentId: d.id, reason: "missing id-map entry for document or master" });
      continue;
    }
    const [mongoDoc, mongoMaster] = await Promise.all([
      mongo.document.findUnique({ where: { id: mongoDocId }, select: { masterDocumentId: true } }),
      mongo.document.findUnique({ where: { id: mongoMasterId }, select: { id: true, resumeRole: true } }),
    ]);
    if (!mongoMaster) {
      problems.push({ documentId: d.id, reason: "master document does not exist in Mongo" });
      continue;
    }
    if (mongoDoc?.masterDocumentId !== mongoMasterId) {
      problems.push({ documentId: d.id, reason: "masterDocumentId not correctly resolved" });
      continue;
    }
    if (mongoMaster.resumeRole !== "MASTER") {
      problems.push({ documentId: d.id, reason: "master reference does not point to a MASTER document", actualRole: mongoMaster.resumeRole });
    }
  }
  check("5. Master references intact (target exists, resumeRole = MASTER)", problems.length === 0, {
    checked: mysqlDocuments.length,
    problems,
  });
}

// -----------------------------------------------------------------------
// 6. Application references (on Document)
// -----------------------------------------------------------------------
async function checkDocumentApplicationReferences() {
  const mysqlDocuments = await mysql.document.findMany({ where: { applicationId: { not: null } } });
  const problems = [];
  for (const d of mysqlDocuments) {
    const mongoDocId = documentMap.get(String(d.id));
    const mongoAppId = applicationMap.get(String(d.applicationId));
    if (!mongoDocId || !mongoAppId) {
      problems.push({ documentId: d.id, reason: "missing id-map entry for document or application" });
      continue;
    }
    const [mongoDoc, mongoApp] = await Promise.all([
      mongo.document.findUnique({ where: { id: mongoDocId }, select: { applicationId: true, userId: true } }),
      mongo.application.findUnique({ where: { id: mongoAppId }, select: { id: true, userId: true } }),
    ]);
    if (!mongoApp) {
      problems.push({ documentId: d.id, reason: "referenced application does not exist in Mongo" });
      continue;
    }
    if (mongoDoc?.applicationId !== mongoAppId) {
      problems.push({ documentId: d.id, reason: "applicationId not correctly resolved" });
      continue;
    }
    if (mongoDoc.userId !== mongoApp.userId) {
      problems.push({ documentId: d.id, reason: "document and its application belong to different users", documentUserId: mongoDoc.userId, applicationUserId: mongoApp.userId });
    }
  }
  check("6. Application references intact (exists, same owning user as Document)", problems.length === 0, {
    checked: mysqlDocuments.length,
    problems,
  });
}

// -----------------------------------------------------------------------
// 7. Resume roles — Main/Master counts per user
// -----------------------------------------------------------------------
async function checkResumeRoles() {
  const mysqlUsers = await mysql.user.findMany({ select: { id: true } });
  const mismatches = [];
  for (const u of mysqlUsers) {
    const mongoUserId = userMap.get(String(u.id));
    const [mysqlMain, mysqlMaster, mongoMain, mongoMaster] = await Promise.all([
      mysql.document.count({ where: { userId: u.id, resumeRole: "MAIN" } }),
      mysql.document.count({ where: { userId: u.id, resumeRole: "MASTER" } }),
      mongo.document.count({ where: { userId: mongoUserId, resumeRole: "MAIN" } }),
      mongo.document.count({ where: { userId: mongoUserId, resumeRole: "MASTER" } }),
    ]);
    if (mysqlMain !== mongoMain || mysqlMaster !== mongoMaster) {
      mismatches.push({ mysqlUserId: u.id, mysqlMain, mongoMain, mysqlMaster, mongoMaster });
    }
  }
  check("7. Main/Master resume-role counts per user match", mismatches.length === 0, {
    usersChecked: mysqlUsers.length,
    mismatches,
  });
}

// -----------------------------------------------------------------------
// 8. Tailored versions
// -----------------------------------------------------------------------
async function checkTailoredVersionCount() {
  const mysqlCount = await mysql.document.count({ where: { sourceDocumentId: { not: null } } });
  const mongoCount = await mongo.document.count({ where: { sourceDocumentId: { not: null } } });
  check("8. Tailored-version count matches (documents with sourceDocumentId)", mysqlCount === mongoCount, {
    mysqlCount,
    mongoCount,
  });
}

// -----------------------------------------------------------------------
// 9. Cross-user integrity — full scan, zero violations
// -----------------------------------------------------------------------
async function checkCrossUserIntegrity() {
  const violations = [];

  const allApplications = await mongo.application.findMany({ select: { id: true, userId: true } });
  const allDocuments = await mongo.document.findMany({
    select: { id: true, userId: true, sourceDocumentId: true, masterDocumentId: true, applicationId: true },
  });
  const applicationOwnerById = new Map(allApplications.map((a) => [a.id, a.userId]));
  const documentOwnerById = new Map(allDocuments.map((d) => [d.id, d.userId]));

  for (const d of allDocuments) {
    if (d.sourceDocumentId && documentOwnerById.get(d.sourceDocumentId) !== d.userId) {
      violations.push({ type: "cross-user-source", documentId: d.id, sourceDocumentId: d.sourceDocumentId });
    }
    if (d.masterDocumentId && documentOwnerById.get(d.masterDocumentId) !== d.userId) {
      violations.push({ type: "cross-user-master", documentId: d.id, masterDocumentId: d.masterDocumentId });
    }
    if (d.applicationId && applicationOwnerById.get(d.applicationId) !== d.userId) {
      violations.push({ type: "cross-user-application", documentId: d.id, applicationId: d.applicationId });
    }
  }

  check("9. Full-dataset scan: zero cross-user references", violations.length === 0, {
    applicationsScanned: allApplications.length,
    documentsScanned: allDocuments.length,
    violations,
  });
}

// -----------------------------------------------------------------------
// 10. Unique constraints actually reject duplicates
// -----------------------------------------------------------------------
async function checkUniqueConstraints() {
  const results = {};

  // Every probe insert is cleaned up immediately regardless of outcome —
  // if the constraint ISN'T enforced (rejected: false), the probe record
  // would otherwise be left behind as a real, silently-created duplicate.

  const anyUser = await mongo.user.findFirst({ select: { email: true } });
  if (anyUser) {
    let probe = null;
    try {
      probe = await mongo.user.create({ data: { name: "Duplicate Probe", email: anyUser.email } });
      results.userEmail = { rejected: false };
    } catch (error) {
      results.userEmail = { rejected: error?.code === "P2002", code: error?.code };
    } finally {
      if (probe) await mongo.user.delete({ where: { id: probe.id } });
    }
  } else {
    results.userEmail = { rejected: null, note: "no User rows to test against" };
  }

  const anyAccount = await mongo.account.findFirst({ select: { provider: true, providerAccountId: true, userId: true } });
  if (anyAccount) {
    let probe = null;
    try {
      probe = await mongo.account.create({
        data: { userId: anyAccount.userId, type: "oauth", provider: anyAccount.provider, providerAccountId: anyAccount.providerAccountId },
      });
      results.accountProviderCompound = { rejected: false };
    } catch (error) {
      results.accountProviderCompound = { rejected: error?.code === "P2002", code: error?.code };
    } finally {
      if (probe) await mongo.account.delete({ where: { id: probe.id } });
    }
  } else {
    results.accountProviderCompound = { rejected: null, note: "no Account rows to test against" };
  }

  const anySession = await mongo.session.findFirst({ select: { sessionToken: true, userId: true } });
  if (anySession) {
    let probe = null;
    try {
      probe = await mongo.session.create({
        data: { userId: anySession.userId, sessionToken: anySession.sessionToken, expires: new Date(Date.now() + 1000) },
      });
      results.sessionToken = { rejected: false };
    } catch (error) {
      results.sessionToken = { rejected: error?.code === "P2002", code: error?.code };
    } finally {
      if (probe) await mongo.session.delete({ where: { id: probe.id } });
    }
  } else {
    results.sessionToken = { rejected: null, note: "no Session rows to test against" };
  }

  const allRejectedOrSkipped = Object.values(results).every((r) => r.rejected === true || r.rejected === null);
  check("10. Unique constraints reject real duplicate inserts", allRejectedOrSkipped, results);
}

// -----------------------------------------------------------------------
// 11. Content integrity
// -----------------------------------------------------------------------
async function checkContentIntegrity() {
  const mysqlDocuments = await mysql.document.findMany();
  const mismatches = [];
  for (const d of mysqlDocuments) {
    const mongoDocId = documentMap.get(String(d.id));
    if (!mongoDocId) {
      mismatches.push({ documentId: d.id, reason: "missing id-map entry" });
      continue;
    }
    const mongoDoc = await mongo.document.findUnique({ where: { id: mongoDocId } });
    if (!mongoDoc) {
      mismatches.push({ documentId: d.id, reason: "document missing in Mongo" });
      continue;
    }
    const contentMatches = sha256(d.content) === sha256(mongoDoc.content);
    const titleMatches = d.title === mongoDoc.title;
    const createdAtMatches = toIso(d.createdAt) === toIso(mongoDoc.createdAt);
    const updatedAtMatches = toIso(d.updatedAt) === toIso(mongoDoc.updatedAt);
    if (!contentMatches || !titleMatches || !createdAtMatches || !updatedAtMatches) {
      mismatches.push({
        documentId: d.id,
        contentMatches,
        titleMatches,
        createdAtMatches,
        updatedAtMatches,
      });
    }
  }

  const mysqlApplications = await mysql.application.findMany();
  for (const a of mysqlApplications) {
    const mongoAppId = applicationMap.get(String(a.id));
    if (!mongoAppId) {
      mismatches.push({ applicationId: a.id, reason: "missing id-map entry" });
      continue;
    }
    const mongoApp = await mongo.application.findUnique({ where: { id: mongoAppId } });
    const jobTitleMatches = a.jobTitle === mongoApp?.jobTitle;
    const jobDescriptionMatches = sha256(a.jobDescription) === sha256(mongoApp?.jobDescription);
    const statusMatches = a.status === mongoApp?.status;
    const createdAtMatches = toIso(a.createdAt) === toIso(mongoApp?.createdAt);
    if (!jobTitleMatches || !jobDescriptionMatches || !statusMatches || !createdAtMatches) {
      mismatches.push({ applicationId: a.id, jobTitleMatches, jobDescriptionMatches, statusMatches, createdAtMatches });
    }
  }

  check("11. Content integrity (Document.content hash, title, status, timestamps)", mismatches.length === 0, {
    documentsChecked: mysqlDocuments.length,
    applicationsChecked: mysqlApplications.length,
    mismatches,
  });
}

try {
  await checkRecordCounts();
  await checkApplicationOwnership();
  await checkDocumentOwnership();
  await checkSourceDocumentChains();
  await checkMasterReferences();
  await checkDocumentApplicationReferences();
  await checkResumeRoles();
  await checkTailoredVersionCount();
  await checkCrossUserIntegrity();
  await checkUniqueConstraints();
  await checkContentIntegrity();
} finally {
  const allPassed = checks.every((c) => c.passed);
  const report = {
    generatedAt: new Date().toISOString(),
    allPassed,
    checks,
  };
  writeFileSync(new URL("../reports/validation-report.json", import.meta.url), JSON.stringify(report, null, 2));
  console.log(`\n[validate] ${checks.filter((c) => c.passed).length}/${checks.length} checks passed.`);
  console.log("[validate] Report written to mongo-migration/reports/validation-report.json");
  await mysql.$disconnect();
  await mongo.$disconnect();
}
