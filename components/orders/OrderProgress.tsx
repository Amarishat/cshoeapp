import Image from "next/image";
import { cn } from "@/lib/cn";
import type { ProgressStep } from "@/lib/orders";

// Step centres as % of the 390px content width (Figma: 68.5 / 204.5 / 340.5px).
const THREE_STEPS = [17.56, 52.44, 87.31];
// Two steps (a cancelled order: confirmed → cancelled) use the outer two.
const TWO_STEPS = [17.56, 87.31];

/**
 * Horizontal order tracker (Figma 1:3672): 25px circles — done = black with a
 * white tick, pending = white with a 3px #CCC ring — joined by black lines.
 * Labels Regular 14; dates Regular 14 at 50%. Steps are data-driven.
 */
export function OrderProgress({ steps }: { steps: ProgressStep[] }) {
  const centres = steps.length === 2 ? TWO_STEPS : THREE_STEPS;
  return (
    <ol aria-label="Order progress" className="relative h-[66px]">
      {steps.slice(0, -1).map((_, i) => (
        <li
          key={`line-${i}`}
          aria-hidden
          className="absolute top-3 h-px bg-ink"
          style={{
            left: `calc(${centres[i]}% + 18.5px)`,
            width: `calc(${centres[i + 1] - centres[i]}% - 37px)`,
          }}
        />
      ))}
      {steps.map((step, i) => (
        <li
          key={step.label}
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center text-center text-[14px] whitespace-nowrap"
          style={{ left: `${centres[i]}%` }}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-[25px] items-center justify-center rounded-full",
              step.done ? "bg-ink" : "border-[3px] border-border bg-white",
            )}
          >
            {step.done && (
              <Image src="/images/checkout/tick.svg" alt="" width={19} height={19} unoptimized />
            )}
          </span>
          <span className="mt-[5px]">
            {step.label}
            <span className="sr-only">{step.done ? " (done)" : " (pending)"}</span>
          </span>
          {step.date && <span className="text-ink/50">{step.date}</span>}
        </li>
      ))}
    </ol>
  );
}
