import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  NotFoundError,
  updateApplication,
  ValidationError,
} from "@/lib/applications";

const runId = Date.now();
let userA: { id: number };
let userB: { id: number };
const createdCompanyIds: number[] = [];

beforeAll(async () => {
  userA = await prisma.user.create({
    data: { name: "Test User A", email: `test-user-a-${runId}@example.test` },
  });
  userB = await prisma.user.create({
    data: { name: "Test User B", email: `test-user-b-${runId}@example.test` },
  });
});

afterAll(async () => {
  await prisma.application.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  await prisma.$disconnect();
});

describe("createApplication", () => {
  it("creates an application and a new company", async () => {
    const app = await createApplication(userA.id, {
      companyName: `Acme Corp ${runId}`,
      jobTitle: "Software Engineer",
    });
    createdCompanyIds.push(app.companyId);

    expect(app.userId).toBe(userA.id);
    expect(app.jobTitle).toBe("Software Engineer");
    expect(app.status).toBe("WISHLIST");
    expect(app.company.name).toBe(`Acme Corp ${runId}`);
  });

  it("reuses an existing company on a case-insensitive name match", async () => {
    const companyName = `Reuse Co ${runId}`;
    const first = await createApplication(userA.id, {
      companyName,
      jobTitle: "Engineer 1",
    });
    createdCompanyIds.push(first.companyId);

    const second = await createApplication(userA.id, {
      companyName: companyName.toUpperCase(),
      jobTitle: "Engineer 2",
    });

    expect(second.companyId).toBe(first.companyId);

    const companies = await prisma.company.count({ where: { name: companyName } });
    expect(companies).toBe(1);
  });

  it("rejects missing required fields", async () => {
    await expect(
      createApplication(userA.id, { companyName: "" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an invalid status value", async () => {
    await expect(
      createApplication(userA.id, {
        companyName: `Bad Status Co ${runId}`,
        jobTitle: "Engineer",
        status: "NOT_A_REAL_STATUS",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("listApplications / getApplication", () => {
  it("only returns the requesting user's applications", async () => {
    const appA = await createApplication(userA.id, {
      companyName: `List Co A ${runId}`,
      jobTitle: "Role A",
    });
    createdCompanyIds.push(appA.companyId);
    const appB = await createApplication(userB.id, {
      companyName: `List Co B ${runId}`,
      jobTitle: "Role B",
    });
    createdCompanyIds.push(appB.companyId);

    const userAApps = await listApplications(userA.id);
    expect(userAApps.some((a) => a.id === appA.id)).toBe(true);
    expect(userAApps.some((a) => a.id === appB.id)).toBe(false);
  });

  it("throws NotFoundError when getting another user's application", async () => {
    const app = await createApplication(userA.id, {
      companyName: `Owned Co ${runId}`,
      jobTitle: "Owner Role",
    });
    createdCompanyIds.push(app.companyId);

    await expect(getApplication(userB.id, app.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getApplication(userA.id, app.id)).resolves.toMatchObject({ id: app.id });
  });

  it("throws NotFoundError for a non-existent application id", async () => {
    await expect(getApplication(userA.id, 999_999_999)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("updateApplication", () => {
  it("updates only the provided fields", async () => {
    const app = await createApplication(userA.id, {
      companyName: `Update Co ${runId}`,
      jobTitle: "Original Title",
      location: "Remote",
    });
    createdCompanyIds.push(app.companyId);

    const updated = await updateApplication(userA.id, app.id, { jobTitle: "New Title" });

    expect(updated.jobTitle).toBe("New Title");
    expect(updated.location).toBe("Remote");
  });

  it("throws NotFoundError when updating another user's application", async () => {
    const app = await createApplication(userA.id, {
      companyName: `Protected Co ${runId}`,
      jobTitle: "Protected Role",
    });
    createdCompanyIds.push(app.companyId);

    await expect(
      updateApplication(userB.id, app.id, { jobTitle: "Hijacked" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deleteApplication", () => {
  it("deletes an application owned by the user", async () => {
    const app = await createApplication(userA.id, {
      companyName: `Delete Co ${runId}`,
      jobTitle: "Temp Role",
    });
    createdCompanyIds.push(app.companyId);

    await deleteApplication(userA.id, app.id);

    await expect(getApplication(userA.id, app.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when deleting another user's application", async () => {
    const app = await createApplication(userA.id, {
      companyName: `Guarded Co ${runId}`,
      jobTitle: "Guarded Role",
    });
    createdCompanyIds.push(app.companyId);

    await expect(deleteApplication(userB.id, app.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
