// Local type mirrors, not imported from @/lib/learning — that module imports
// the Prisma client (server-only) and must never reach a "use client" bundle.

export type LearningApplicationContext = {
  id: string;
  jobTitle: string;
  companyName: string;
  hasJobDescription: boolean;
};

export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type SkillLevel = "NONE" | "FAMILIAR" | "PROFICIENT";
export type LearningSource = "PERSONAL" | "APPLICATION" | "RECOMMENDED";

export type TopicProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type TopicProgressData = { status: TopicProgressStatus; completedAt: string | null };
export type ProgressSummary = { completed: number; total: number; percentage: number };

export type SavedTopic = {
  topic: string;
  reason: string;
  priority: Priority;
  currentLevel: SkillLevel | null;
  recommendedLevel: SkillLevel | null;
  prerequisites: string[];
  id: string;
  progress: TopicProgressData | null;
};

export type SavedPathListItem = {
  id: string;
  source: LearningSource;
  title: string;
  summary: string | null;
  applicationId: string | null;
  application: { id: string; jobTitle: string; company: { name: string } } | null;
  _count: { topics: number };
  createdAt: string;
  updatedAt: string;
};

export type SavedPathDetail = SavedPathListItem & { topics: SavedTopic[]; progressSummary: ProgressSummary };

export type ResourceType = "VIDEO" | "PLAYLIST" | "DOCUMENTATION" | "ARTICLE" | "COURSE" | "GITHUB" | "OTHER";
export type ResourceProvider = "YOUTUBE" | "OFFICIAL_DOCS" | "USER_LINK";

export type Resource = {
  id: string;
  type: ResourceType;
  provider: ResourceProvider;
  discoveryMethod: "SEARCH" | "CURATED" | "USER_ADDED";
  title: string;
  whyRecommended: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  durationSeconds: number | null;
  itemCount: number | null;
  viewCount: number | null;
  isOfficial: boolean;
};

export type TopicResourceState = { resources: Resource[]; fetchedAt: string | null; stale: boolean; warning?: string | null };
export type ResourcesByTopic = Record<string, TopicResourceState>;

export type ResourceFormState = { title: string; url: string; type: ResourceType; description: string };
export const EMPTY_RESOURCE_FORM: ResourceFormState = { title: "", url: "", type: "ARTICLE", description: "" };
export const RESOURCE_TYPES: ResourceType[] = ["VIDEO", "PLAYLIST", "ARTICLE", "DOCUMENTATION", "COURSE", "GITHUB", "OTHER"];

export type PersonalTopicForm = {
  topic: string;
  reason: string;
  priority: Priority;
  currentLevel: SkillLevel;
  recommendedLevel: SkillLevel;
};
export const EMPTY_PERSONAL_TOPIC_FORM: PersonalTopicForm = {
  topic: "",
  reason: "",
  priority: "MEDIUM",
  currentLevel: "NONE",
  recommendedLevel: "PROFICIENT",
};
export const PRIORITY_OPTIONS: Priority[] = ["HIGH", "MEDIUM", "LOW"];
export const SKILL_LEVEL_OPTIONS: SkillLevel[] = ["NONE", "FAMILIAR", "PROFICIENT"];

export type WorkspaceTab = "overview" | "topics" | "resources" | "notes";
export type PathNoteRow = { topicId: string; topicName: string; content: string; updatedAt: string };

export type ResourceHandlers = {
  refresh: (topicId: string) => Promise<string | null>;
  add: (topicId: string, form: ResourceFormState) => Promise<string | null>;
  edit: (topicId: string, resourceId: string, form: ResourceFormState) => Promise<string | null>;
  delete: (topicId: string, resourceId: string) => void;
};
