"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

const calendarComponents = {
  Chevron: ({ className, orientation, size = 16 }: {
    className?: string;
    size?: number;
    disabled?: boolean;
    orientation?: "up" | "down" | "left" | "right";
  }) => {
    const Icon =
      orientation === "left" ? ChevronLeft :
      orientation === "right" ? ChevronRight :
      orientation === "up" ? ChevronUp :
      ChevronDown;

    return <Icon className={cn("size-4", className)} size={size} aria-hidden="true" />;
  },
} satisfies NonNullable<React.ComponentProps<typeof DayPicker>["components"]>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 absolute left-1 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 absolute right-1 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse space-x-1",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 aria-selected:bg-accent [&.day-range-end]:rounded-r-md",
          props.mode === "range"
            ? "[&.day-range-end]:rounded-r-md [&.day-range-start]:rounded-l-md first:aria-selected:rounded-l-md last:aria-selected:rounded-r-md"
            : "aria-selected:rounded-md",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
        ),
        range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus-within:bg-primary focus-within:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={calendarComponents}
      {...props}
    />
  );
}

export { Calendar };
