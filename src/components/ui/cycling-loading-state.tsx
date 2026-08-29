"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/loading-state";

// Mounted fresh each time a request starts, so `index` naturally starts at
// 0 every time — no effect-based reset needed.
export function CyclingLoadingState({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => Math.min(i + 1, messages.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [messages.length]);

  return <LoadingState label={messages[index]} />;
}
