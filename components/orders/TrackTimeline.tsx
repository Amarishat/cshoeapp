import Image from "next/image";
import { cn } from "@/lib/cn";
import type { TrackStep } from "@/lib/orders";

/**
 * Track Order timeline (Figma 1:4176): 27px line-md:confirm-circle icons
 * (pending at 50%), 17px gap to the text, 2px connectors — black into
 * completed steps, #CCC at 70% into pending ones. Step title Medium 17 with
 * its date (Regular 17, 50%) inline; events Regular 15 with a 50% timestamp.
 */
export function TrackTimeline({ steps }: { steps: TrackStep[] }) {
  return (
    <ol aria-label="Order status" className="flex flex-col">
      {steps.map((step, i) => {
        const next = steps[i + 1];
        return (
          <li key={step.key} className="relative flex gap-[17px] pb-[31px] last:pb-0">
            {next && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 bottom-[5px] left-[12.5px] w-0.5",
                  next.done ? "bg-ink" : "bg-border/70",
                )}
              />
            )}
            <span aria-hidden className="relative mt-[-3px] flex size-[27px] shrink-0 items-center justify-center">
              <Image
                src={step.done ? "/images/orders/step-done.svg" : "/images/orders/step-pending.svg"}
                alt=""
                width={22}
                height={22}
                unoptimized
                className="size-[20.25px]"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("flex flex-wrap items-baseline gap-x-1.5 text-[17px]", !step.done && "text-ink/50")}>
                <span className="font-medium">{step.title}</span>
                {step.date && <span className="text-ink/50">{step.date}</span>}
                <span className="sr-only">{step.done ? " (completed)" : " (pending)"}</span>
              </p>
              {step.events.length > 0 && (
                <ul className="mt-[14px] flex flex-col gap-3 text-[15px]">
                  {step.events.map((event) => (
                    <li key={event.message}>
                      <p>{event.message}</p>
                      <p className="mt-0.5 text-ink/50">{event.time}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
