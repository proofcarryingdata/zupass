import { cn } from "../src/util";

export function NewButton(
  props: React.HTMLAttributes<HTMLDivElement>
): JSX.Element {
  return (
    <div
      {...props}
      className={cn(
        "border-4 border-cyan-950",
        "text-center",
        "bg-cyan-700 py-2 px-4 cursor-pointer hover:bg-cyan-600  transition-all duration-100",
        "rounded font-bold shadow-lg select-none active:ring-2 active:ring-offset-4 active:ring-white ring-opacity-60 ring-offset-[#19473f]",
        "text-lg",
        props.className
      )}
    />
  );
}
