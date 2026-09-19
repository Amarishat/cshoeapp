"use client";

import { Tabs } from "@/components/ui/Tabs";
import { usePreferencesStore } from "@/lib/store/preferences";
import type { Audience } from "@/lib/types";

const items: { value: Audience; label: string }[] = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "kids", label: "Kids" },
];

/** Men / Women / Kids tabs; the choice is remembered and shared with other screens. */
export function AudienceTabs() {
  const audience = usePreferencesStore((s) => s.audience);
  const setAudience = usePreferencesStore((s) => s.setAudience);

  return (
    <Tabs ariaLabel="Shop for" items={items} value={audience} onValueChange={setAudience} />
  );
}
