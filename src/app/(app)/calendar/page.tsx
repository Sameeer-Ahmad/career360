import { Calendar } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export default function CalendarPage() {
  return (
    <PlaceholderPage
      title="Calendar"
      description="Upcoming interviews and application deadlines will show up here."
      icon={Calendar}
    />
  );
}
