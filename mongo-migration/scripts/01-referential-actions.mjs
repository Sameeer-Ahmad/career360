// Phase 3 — empirically verifies how Prisma 6.19.3's MongoDB connector
// actually behaves for the seven referential actions the migration design
// depends on. Throwaway records only, in the scratch database
// (career360_migration_scratch) — never touches MySQL or the real Mongo db.
//
// Each test creates its own isolated fixture, performs the delete under
// test (wrapped — some of these are EXPECTED to throw), observes what
// actually happened, and records a structured result. Cleanup runs at the
// end regardless of pass/fail.
import { writeFileSync } from "node:fs";
import { makeMongoClient } from "./lib/clients.mjs";

const mongo = makeMongoClient();
const results = [];
const runId = Date.now();
const createdUserIds = [];
const createdCompanyIds = [];

function record(name, description, actualBehavior, appLevelHandlingRequired, detail) {
  results.push({ name, description, actualBehavior, appLevelHandlingRequired, detail });
  console.log(`[${appLevelHandlingRequired ? "APP-LEVEL REQUIRED" : "AUTO-HANDLED"}] ${name}: ${actualBehavior}`);
}

async function tryDelete(fn) {
  try {
    await fn();
    return { threw: false, code: null, message: null };
  } catch (error) {
    return {
      threw: true,
      code: error?.code ?? null,
      message: error instanceof Error ? error.message.split("\n").filter(Boolean).pop() : String(error),
    };
  }
}

async function makeUser(suffix) {
  const user = await mongo.user.create({
    data: { name: `Ref Test ${suffix}`, email: `ref-test-${runId}-${suffix}@example.test` },
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeCompany(suffix) {
  const company = await mongo.company.create({ data: { name: `Ref Test Co ${runId}-${suffix}` } });
  createdCompanyIds.push(company.id);
  return company;
}

// --- Test 1: User -> Account cascade ---------------------------------
async function testUserAccountCascade() {
  const user = await makeUser("account-cascade");
  const account = await mongo.account.create({
    data: { userId: user.id, type: "oauth", provider: "google", providerAccountId: `acct-${runId}` },
  });

  const outcome = await tryDelete(() => mongo.user.delete({ where: { id: user.id } }));
  const survivor = outcome.threw ? account : await mongo.account.findUnique({ where: { id: account.id } });
  const cascaded = !outcome.threw && survivor === null;

  record(
    "User -> Account cascade",
    "onDelete: Cascade declared on Account.user.",
    outcome.threw
      ? `User delete was BLOCKED (${outcome.code}: ${outcome.message})`
      : cascaded
        ? "Account was deleted automatically — Prisma cascade emulation worked for this cross-model relation."
        : "Account survived — cascade was NOT applied.",
    !(!outcome.threw && cascaded),
    { userId: user.id, accountId: account.id, outcome },
  );
  await mongo.account.deleteMany({ where: { id: account.id } });
  await mongo.user.deleteMany({ where: { id: user.id } });
}

// --- Test 2: User -> Session cascade ---------------------------------
async function testUserSessionCascade() {
  const user = await makeUser("session-cascade");
  const session = await mongo.session.create({
    data: { userId: user.id, sessionToken: `sess-${runId}`, expires: new Date(Date.now() + 86400000) },
  });

  const outcome = await tryDelete(() => mongo.user.delete({ where: { id: user.id } }));
  const survivor = outcome.threw ? session : await mongo.session.findUnique({ where: { id: session.id } });
  const cascaded = !outcome.threw && survivor === null;

  record(
    "User -> Session cascade",
    "onDelete: Cascade declared on Session.user.",
    outcome.threw
      ? `User delete was BLOCKED (${outcome.code}: ${outcome.message})`
      : cascaded
        ? "Session was deleted automatically — Prisma cascade emulation worked for this cross-model relation."
        : "Session survived — cascade was NOT applied.",
    !(!outcome.threw && cascaded),
    { userId: user.id, sessionId: session.id, outcome },
  );
  await mongo.session.deleteMany({ where: { id: session.id } });
  await mongo.user.deleteMany({ where: { id: user.id } });
}

// --- Test 3: User -> Document cascade ---------------------------------
async function testUserDocumentCascade() {
  const user = await makeUser("document-cascade");
  const doc = await mongo.document.create({
    data: { userId: user.id, title: "Ref Test Resume", content: "content", resumeRole: "MAIN" },
  });

  const outcome = await tryDelete(() => mongo.user.delete({ where: { id: user.id } }));
  const survivor = outcome.threw ? doc : await mongo.document.findUnique({ where: { id: doc.id } });
  const cascaded = !outcome.threw && survivor === null;

  record(
    "User -> Document cascade",
    "onDelete: Cascade declared on Document.user.",
    outcome.threw
      ? `User delete was BLOCKED (${outcome.code}: ${outcome.message})`
      : cascaded
        ? "Document was deleted automatically — Prisma cascade emulation worked for this cross-model relation."
        : "Document survived — cascade was NOT applied.",
    !(!outcome.threw && cascaded),
    { userId: user.id, documentId: doc.id, outcome },
  );
  await mongo.document.deleteMany({ where: { id: doc.id } });
  await mongo.user.deleteMany({ where: { id: user.id } });
}

// --- Test 4: Company -> Application Restrict ---------------------------
async function testCompanyApplicationRestrict() {
  const user = await makeUser("restrict-owner");
  const company = await makeCompany("restrict");
  const application = await mongo.application.create({
    data: { userId: user.id, companyId: company.id, jobTitle: "Ref Test Role", status: "WISHLIST" },
  });

  const outcome = await tryDelete(() => mongo.company.delete({ where: { id: company.id } }));
  const companyStillExists = (await mongo.company.findUnique({ where: { id: company.id } })) !== null;
  const applicationStillExists = (await mongo.application.findUnique({ where: { id: application.id } })) !== null;
  const blockedCorrectly = outcome.threw && companyStillExists && applicationStillExists;

  record(
    "Company -> Application Restrict",
    "onDelete: Restrict declared on Application.company.",
    blockedCorrectly
      ? `Delete was BLOCKED as expected (${outcome.code}: ${outcome.message}) — Restrict emulation worked.`
      : `Delete was NOT blocked as expected — threw=${outcome.threw}, companyStillExists=${companyStillExists}, applicationStillExists=${applicationStillExists}.`,
    !blockedCorrectly,
    { companyId: company.id, applicationId: application.id, outcome, companyStillExists, applicationStillExists },
  );
  await mongo.application.deleteMany({ where: { id: application.id } });
  await mongo.company.deleteMany({ where: { id: company.id } });
  await mongo.user.deleteMany({ where: { id: user.id } });
}

// --- Test 5: Document self-relation Cascade (source -> tailored) -------
async function testDocumentSourceCascade() {
  const user = await makeUser("source-cascade");
  const source = await mongo.document.create({
    data: { userId: user.id, title: "Main Resume", content: "content", resumeRole: "MAIN" },
  });
  const tailored = await mongo.document.create({
    data: { userId: user.id, title: "Tailored Resume", content: "content", sourceDocumentId: source.id },
  });

  const outcome = await tryDelete(() => mongo.document.delete({ where: { id: source.id } }));
  const tailoredAfter = await mongo.document.findUnique({ where: { id: tailored.id } });
  const sourceAfter = await mongo.document.findUnique({ where: { id: source.id } });

  record(
    "Document.sourceDocument self-relation Cascade",
    "MySQL cascades: deleting a source resume deletes its tailored versions. Schema declares onDelete: NoAction here (Prisma REQUIRES NoAction for self-relations on MongoDB — confirmed at schema-validation time).",
    outcome.threw
      ? `Delete of the source document was BLOCKED outright (${outcome.code}: ${outcome.message}) while a tailored version still references it — Prisma refuses the delete rather than leaving a dangling reference.`
      : `Delete succeeded and left the tailored version's sourceDocumentId dangling at a now-nonexistent id (source still exists: ${sourceAfter !== null}, tailored still exists: ${tailoredAfter !== null}).`,
    true,
    { sourceId: source.id, tailoredId: tailored.id, outcome, sourceStillExists: sourceAfter !== null, tailoredStillExists: tailoredAfter !== null, tailoredSourceDocumentIdAfter: tailoredAfter?.sourceDocumentId ?? null },
  );

  // Child (tailored) before parent (source) — the same NoAction constraint
  // that blocked the delete-under-test above blocks a parent-before-child
  // cleanup too, which is itself confirmation of the finding.
  await mongo.document.deleteMany({ where: { id: tailored.id } });
  await mongo.document.deleteMany({ where: { id: source.id } });
  await mongo.user.deleteMany({ where: { id: user.id } });
}

// --- Test 6: Document self-relation SetNull (master) --------------------
async function testDocumentMasterSetNull() {
  const user = await makeUser("master-setnull");
  const master = await mongo.document.create({
    data: { userId: user.id, title: "Master Resume", content: "content", resumeRole: "MASTER" },
  });
  const tailored = await mongo.document.create({
    data: { userId: user.id, title: "Tailored Resume", content: "content", masterDocumentId: master.id },
  });

  const outcome = await tryDelete(() => mongo.document.delete({ where: { id: master.id } }));
  const tailoredAfter = await mongo.document.findUnique({ where: { id: tailored.id } });
  const masterAfter = await mongo.document.findUnique({ where: { id: master.id } });

  record(
    "Document.masterDocument self-relation SetNull",
    "MySQL sets masterDocumentId to null when the referenced Master is deleted. Schema declares onDelete: NoAction here (Prisma REQUIRES NoAction for self-relations on MongoDB — confirmed at schema-validation time).",
    outcome.threw
      ? `Delete of the master document was BLOCKED outright (${outcome.code}: ${outcome.message}) while a tailored version still references it.`
      : `Delete succeeded and left masterDocumentId dangling at "${tailoredAfter?.masterDocumentId}" (master still exists: ${masterAfter !== null}).`,
    true,
    { masterId: master.id, tailoredId: tailored.id, outcome, masterStillExists: masterAfter !== null, tailoredMasterDocumentIdAfter: tailoredAfter?.masterDocumentId ?? null },
  );

  await mongo.document.deleteMany({ where: { id: tailored.id } });
  await mongo.document.deleteMany({ where: { id: master.id } });
  await mongo.user.deleteMany({ where: { id: user.id } });
}

// --- Test 7: Document -> Application SetNull (not a self-relation) -----
async function testDocumentApplicationSetNull() {
  const user = await makeUser("app-setnull");
  const company = await makeCompany("app-setnull");
  const application = await mongo.application.create({
    data: { userId: user.id, companyId: company.id, jobTitle: "Ref Test Role 2", status: "WISHLIST" },
  });
  const doc = await mongo.document.create({
    data: { userId: user.id, title: "Tagged Resume", content: "content", applicationId: application.id },
  });

  const outcome = await tryDelete(() => mongo.application.delete({ where: { id: application.id } }));
  const docAfter = await mongo.document.findUnique({ where: { id: doc.id } });
  const wasNulled = !outcome.threw && docAfter?.applicationId === null;

  record(
    "Document.application SetNull",
    "Not a self-relation (Application is a different model from Document) — onDelete: SetNull IS schema-declarable here.",
    outcome.threw
      ? `Delete of the application was BLOCKED outright (${outcome.code}: ${outcome.message}).`
      : wasNulled
        ? "applicationId WAS nulled automatically — Prisma SetNull emulation worked for this cross-model relation."
        : `applicationId was LEFT DANGLING at "${docAfter?.applicationId}" — SetNull was NOT applied automatically even for this cross-model relation.`,
    !wasNulled,
    { applicationId: application.id, documentId: doc.id, outcome, documentApplicationIdAfter: docAfter?.applicationId ?? null },
  );

  await mongo.document.deleteMany({ where: { id: doc.id } });
  await mongo.application.deleteMany({ where: { id: application.id } });
  await mongo.company.deleteMany({ where: { id: company.id } });
  await mongo.user.deleteMany({ where: { id: user.id } });
}

try {
  await testUserAccountCascade();
  await testUserSessionCascade();
  await testUserDocumentCascade();
  await testCompanyApplicationRestrict();
  await testDocumentSourceCascade();
  await testDocumentMasterSetNull();
  await testDocumentApplicationSetNull();
} finally {
  // Best-effort final sweep in case any test's own cleanup was skipped by
  // an earlier unexpected throw.
  await mongo.application.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
  await mongo.document.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
  await mongo.account.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
  await mongo.session.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
  await mongo.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
  await mongo.company.deleteMany({ where: { id: { in: createdCompanyIds } } }).catch(() => {});

  const report = {
    generatedAt: new Date().toISOString(),
    prismaVersion: "6.19.3",
    database: "career360_migration_scratch",
    results,
    summary: {
      total: results.length,
      autoHandledByPrisma: results.filter((r) => !r.appLevelHandlingRequired).length,
      requiresApplicationLevelHandling: results.filter((r) => r.appLevelHandlingRequired).map((r) => r.name),
    },
  };
  writeFileSync(new URL("../reports/referential-action-report.json", import.meta.url), JSON.stringify(report, null, 2));
  console.log("\n[referential-actions] Report written to mongo-migration/reports/referential-action-report.json");

  await mongo.$disconnect();
}
