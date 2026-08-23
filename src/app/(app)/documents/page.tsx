import { FileText } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default function DocumentsPage() {
  return (
    <PlaceholderPage
      title="Documents"
      description="Resumes, cover letters, and other application documents will live here."
      icon={FileText}
    />
  );
}
