"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type CoverLetterApplicationOption = {
  id: string;
  jobTitle: string;
  companyName: string;
};

/** Lets the user pick which application to write a cover letter for, then hands off to the canonical /cover-letter?applicationId= flow — reuses that page's existing logic for loading (or creating) the letter, so this component never talks to the cover-letter APIs itself. */
export function CoverLetterStartPicker({ applications }: { applications: CoverLetterApplicationOption[] }) {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState(applications[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="cover-letter-start-application">Application</Label>
        <Select
          id="cover-letter-start-application"
          value={applicationId}
          onChange={(event) => setApplicationId(event.target.value)}
        >
          {applications.map((application) => (
            <option key={application.id} value={application.id}>
              {application.jobTitle} at {application.companyName}
            </option>
          ))}
        </Select>
      </div>
      <Button
        type="button"
        onClick={() => applicationId && router.push(`/cover-letter?applicationId=${applicationId}`)}
        disabled={!applicationId}
      >
        <FileEdit className="size-4" />
        Continue
      </Button>
    </div>
  );
}
