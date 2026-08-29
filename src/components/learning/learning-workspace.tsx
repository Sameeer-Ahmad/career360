"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecommendedTab } from "@/components/learning/recommended-tab";
import { MyLearningTab } from "@/components/learning/my-learning-tab";
import { PersonalTab } from "@/components/learning/personal-tab";
import type { LearningApplicationContext } from "@/components/learning/learning-types";

export type { LearningApplicationContext } from "@/components/learning/learning-types";

export function LearningWorkspace({
  applicationContext,
  calendarConnected = false,
}: {
  applicationContext?: LearningApplicationContext;
  calendarConnected?: boolean;
}) {
  const [tab, setTab] = useState<"recommended" | "paths" | "personal">("recommended");
  const [pathsReloadKey, setPathsReloadKey] = useState(0);

  function handleSaved() {
    setPathsReloadKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="paths">My Learning</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "recommended" && (
        <RecommendedTab applicationContext={applicationContext} onSaved={handleSaved} />
      )}
      {tab === "paths" && <MyLearningTab reloadKey={pathsReloadKey} calendarConnected={calendarConnected} />}
      {tab === "personal" && (
        <PersonalTab reloadKey={pathsReloadKey} calendarConnected={calendarConnected} onSaved={handleSaved} />
      )}
    </div>
  );
}
