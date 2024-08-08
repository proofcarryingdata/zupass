import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
import { cn } from "../src/util";

type ButtonVariant = "cyan" | "blackWhite" | "green" | "purple";

interface NewButtonProps
  extends DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  variant?: ButtonVariant;
}

export function NewButton({
  variant = "green",
  ...props
}: NewButtonProps): JSX.Element {
  const variantStyles: Record<ButtonVariant, string> = {
    cyan: "border-cyan-950 bg-cyan-700 hover:bg-cyan-600 ring-offset-[#19473f]",
    blackWhite:
      "border-black bg-white hover:bg-gray-100 text-black ring-offset-black",
    green:
      "border-green-950 bg-[#206b5e] hover:bg-[#1b8473] ring-offset-[#1f4d3f]",
    purple:
      "border-purple-950 bg-purple-700 hover:bg-purple-600 ring-offset-[#3f1f4d]"
  };

  return (
    <button
      {...props}
      className={cn(
        "text-white",
        "whitespace-nowrap w-full",
        "border-4",
        "text-center",
        "py-2 px-4 cursor-pointer transition-all duration-100",
        "rounded-lg font-bold shadow-lg select-none active:ring-2 active:ring-offset-4 active:ring-white ring-opacity-60",
        "text-lg",
        variantStyles[variant],
        props.className
      )}
    />
  );
}

export function NewLinkButton({
  ...props
}: NewButtonProps & { to: string }): JSX.Element {
  return (
    <NewButton {...props} onClick={() => (window.location.href = props.to)} />
  );
}
