import Image from "next/image";
import { cn } from "@/lib/cn";
import type { ProgressStep } from "@/lib/orders";

/**
 * Vertical order tracker (Figma 1:3892): 25px circles (done = black with a
 * white tick, pending = white with a #CCC ring) joined by 38px #CCC lines,
 * Regular 17 labels 15px to the right; pending labels at 70%.
 */
export function OrderTimeline({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol aria-label="Order progress" className="flex flex-col">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex gap-[15px] pb-10 last:pb-0">
          {i < steps.length - 1 && (
            <span aria-hidden className="absolute top-[26px] left-3 h-[38px] w-px bg-border" />
          )}
          <span
            aria-hidden
            className={cn(
              "flex size-[25px] shrink-0 items-center justify-center rounded-full",
              step.done ? "bg-ink" : "border-[3px] border-border bg-white",
            )}
          >
            {step.done && (
              <Image src="/images/checkout/tick.svg" alt="" width={18} height={18} unoptimized />
            )}
          </span>
          <span className={cn("text-[17px] leading-[25px]", !step.done && "text-ink/70")}>
            {step.label}
            <span className="sr-only">{step.done ? " (done)" : " (pending)"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
