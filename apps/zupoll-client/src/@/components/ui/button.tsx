import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  `inline-flex items-center justify-center whitespace-nowrap rounded-md
  text-sm font-medium transition-colors focus-visible:outline-none 
  disabled:pointer-events-none disabled:opacity-50
  ring-foreground active:ring-offset-2 active:ring-2 active:ring-offset-background`,
  {
    variants: {
      variant: {
        default:
          "bg-blue-400 text-blue-900 shadow hover:bg-blue-500 hover:text-blue-100",
        secondary:
          "bg-gray-400 text-gray-900 shadow-sm hover:bg-gray-500 hover:text-gray-100",
        destructive:
          "bg-red-400 text-red-900 shadow-sm hover:bg-red-500 hover:text-red-100",
        warning:
          "bg-yellow-400 text-yellow-900 shadow-sm hover:bg-yellow-500 hover:text-yellow-100",
        creative:
          "bg-green-400 text-green-900 shadow-sm hover:bg-green-500 hover:text-green-100",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent border-2",
        ghost: "hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
