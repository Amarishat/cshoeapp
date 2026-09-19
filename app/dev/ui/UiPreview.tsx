"use client";

import { useState, type ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BagButton } from "@/components/layout/BagButton";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { useBagStore } from "@/lib/store/bag";
import type { Audience } from "@/lib/types";

const iconNames: IconName[] = [
  "back",
  "bag",
  "bell",
  "camera",
  "heart",
  "heartFilled",
  "home",
  "menu",
  "mic",
  "search",
  "user",
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border py-6">
      <h2 className="px-gutter text-caption font-semibold tracking-wide text-ink/50 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function UiPreview() {
  const [audience, setAudience] = useState<Audience>("men");
  const add = useBagStore((s) => s.add);
  const clear = () => useBagStore.setState({ items: [] });

  return (
    <main className="pb-(--bottom-nav-height)">
      <AppHeader leading="back" title="Foundation preview" actions={<BagButton />} />

      <Section title="Typography">
        <div className="flex flex-col gap-2 px-gutter">
          <p className="font-display text-[32px] leading-tight font-semibold">Custom Stride</p>
          <p className="text-heading">Heading 22 / Inter</p>
          <p className="text-body font-medium">Body 19 Medium</p>
          <p className="text-label">Label 17</p>
          <p className="text-secondary text-muted">Secondary 16 muted</p>
          <p className="text-caption text-ink/40">Caption 12</p>
        </div>
      </Section>

      <Section title="Colours">
        <div className="flex flex-wrap gap-3 px-gutter">
          {["bg-primary", "bg-surface", "bg-border", "bg-muted", "bg-success", "bg-accent", "bg-action"].map(
            (c) => (
              <div key={c} className={`size-12 rounded-md border border-ink/10 ${c}`} title={c} />
            ),
          )}
        </div>
      </Section>

      <Section title="Icons">
        <div className="flex flex-wrap gap-5 px-gutter">
          {iconNames.map((name) => (
            <Icon key={name} name={name} className="size-[30px]" />
          ))}
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          ariaLabel="Audience"
          value={audience}
          onValueChange={setAudience}
          items={[
            { value: "men", label: "Men" },
            { value: "women", label: "Women" },
            { value: "kids", label: "Kids" },
          ]}
        />
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-4 px-gutter">
          <Button className="w-full">Log in</Button>
          <Button size="lg" className="w-full">
            Add To Bag
          </Button>
          <Button size="lg" variant="secondary" className="w-full">
            Buy Now
          </Button>
        </div>
      </Section>

      <Section title="Text field">
        <div className="px-gutter">
          <TextField label="Phone Number" placeholder="Enter Your Phone Number" inputMode="tel" />
        </div>
      </Section>

      <Section title="Bag badge (client store)">
        <div className="flex gap-3 px-gutter">
          <Button
            size="md"
            variant="secondary"
            className="flex-1 text-body"
            onClick={() =>
              add({ id: crypto.randomUUID(), productId: "demo", size: "7", quantity: 1 })
            }
          >
            Add item
          </Button>
          <Button size="md" variant="secondary" className="flex-1 text-body" onClick={clear}>
            Clear
          </Button>
        </div>
      </Section>

      <BottomNav />
    </main>
  );
}
