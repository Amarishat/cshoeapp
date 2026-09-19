import Image from "next/image";
import { cn } from "@/lib/cn";

const steps = ["Address", "Order Summary", "Payment"] as const;
// Step centres as % of the 390px content width (Figma: 57 / 193.5 / 333px).
const centres = [14.62, 49.62, 85.38];

/**
 * Checkout progress (Figma 1:3435 / 1:3501): 25px circles joined by black
 * lines. Current step = black with its number; completed = #CCC with a white
 * tick; upcoming = #CCC with its number. Labels are Medium 15 — current step
 * black, others at 50%.
 */
export function CheckoutStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Checkout progress" className="px-gutter">
      <ol className="relative h-[61px]">
        {[0, 1].map((i) => (
          <li
            key={`line-${i}`}
            aria-hidden
            className="absolute top-3 h-px bg-ink"
            style={{
              left: `calc(${centres[i]}% + 27.5px)`,
              width: `calc(${centres[i + 1] - centres[i]}% - 55px)`,
            }}
          />
        ))}
        {steps.map((label, i) => {
          const step = i + 1;
          const isCurrent = step === current;
          const completed = step < current;
          return (
            <li
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${centres[i]}%` }}
            >
              <span
                className={cn(
                  "flex size-[25px] items-center justify-center rounded-full text-[17px] font-semibold text-white",
                  isCurrent ? "bg-ink" : "bg-border",
                )}
              >
                {completed ? (
                  <>
                    <Image src="/images/checkout/tick.svg" alt="" width={19} height={19} unoptimized />
                    <span className="sr-only">Completed:</span>
                  </>
                ) : (
                  step
                )}
              </span>
              <span
                className={cn(
                  "mt-4 text-[15px] font-medium whitespace-nowrap",
                  !isCurrent && "text-ink/50",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
