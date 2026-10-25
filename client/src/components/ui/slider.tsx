"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";

type SliderProps = SliderPrimitive.Root.Props<number> & {
  "aria-label"?: string;
};

function Slider({ className, "aria-label": ariaLabel, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full touch-none items-center py-1.5 select-none">
        <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Indicator className="h-full bg-primary transition-[width]" />
          <SliderPrimitive.Thumb
            aria-label={ariaLabel}
            className="block size-3.5 rounded-full border-2 border-primary bg-background shadow-sm transition-[box-shadow,transform] outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 data-dragging:scale-110"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
