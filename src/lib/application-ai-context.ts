import type { ApplicationStatus, EmploymentType, Priority } from "@prisma/client";

export type ApplicationContext = {
  jobTitle: string;
  companyName: string;
  location: string | null;
  employmentType: EmploymentType | null;
  status: ApplicationStatus;
  priority: Priority | null;
  salaryMin: number | null;
  salaryMax: number | null;
  jobDescription: string | null;
};

/** Picks only the fields relevant to career guidance — never IDs, timestamps, or foreign keys. */
export function toApplicationContext(application: {
  jobTitle: string;
  company: { name: string };
  location: string | null;
  employmentType: EmploymentType | null;
  status: ApplicationStatus;
  priority: Priority | null;
  salaryMin: number | null;
  salaryMax: number | null;
  jobDescription: string | null;
}): ApplicationContext {
  return {
    jobTitle: application.jobTitle,
    companyName: application.company.name,
    location: application.location,
    employmentType: application.employmentType,
    status: application.status,
    priority: application.priority,
    salaryMin: application.salaryMin,
    salaryMax: application.salaryMax,
    jobDescription: application.jobDescription,
  };
}
