import { cn } from "../src/util";

type ButtonVariant = "cyan" | "blackWhite" | "green" | "purple";

interface NewInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: ButtonVariant;
}

export function NewInput({
  variant = "green",
  ...props
}: NewInputProps): JSX.Element {
  const variantStyles: Record<ButtonVariant, string> = {
    cyan: "border-cyan-950 bg-cyan-700 hover:bg-cyan-600 ring-offset-[#19473f]",
    blackWhite:
      "border-black bg-white hover:bg-gray-100 text-black ring-offset-black",
    green:
      "border-green-950 bg-[#2a8a7a] hover:bg-[#35a693] active:bg-[#35a693] ring-offset-[#1f4d3f]",
    purple:
      "border-purple-950 bg-purple-700 hover:bg-purple-600 ring-offset-[#3f1f4d]"
  };

  return (
    <input
      type="text"
      {...props}
      className={cn(
        "border-4",
        "py-2 px-4 cursor-pointer transition-all duration-100",
        "rounded-lg font-bold shadow-lg select-none active:ring-2 active:ring-offset-4 active:ring-white ring-opacity-60",
        "text-lg placeholder-white",
        variantStyles[variant],
        props.className
      )}
    />
  );
}
