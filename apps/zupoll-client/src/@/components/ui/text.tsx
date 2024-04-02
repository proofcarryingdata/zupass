import React from "react";
import { cn } from "../../lib/utils";

export const Title = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "font-semibold leading-7 text-gray-900 text-xl mb-1",
      className
    )}
    {...props}
  />
));
Title.displayName = "Title";

export const Subtitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "block text-sm font-medium leading-6 text-gray-900 mt-3 mb-1",
      className
    )}
    {...props}
  />
));
Subtitle.displayName = "Subtitle";

export const Description = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-1 mb-1 text-sm leading-6 text-gray-600", className)}
    {...props}
  />
));
Description.displayName = "Description";
