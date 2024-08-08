import { CircleButton } from "@pcd/passport-ui";
import { cn } from "../../src/util";

export function MyCircleButton({
  children,
  onClick,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  diameter: number;
  padding: number;
} & React.HTMLAttributes<HTMLButtonElement>): JSX.Element {
  return (
    <CircleButton
      {...props}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "transition-all duration-200 p-4",
        "active:ring-2 active:ring-offset-4 active:ring-white ring-opacity-60 ring-offset-[#19473f]"
      )}
    >
      {children}
    </CircleButton>
  );
}
