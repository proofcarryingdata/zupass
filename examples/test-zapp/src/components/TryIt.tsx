import type { ReactNode } from "react";

export function TryIt({
  onClick,
  label
}: {
  onClick: () => void | Promise<void>;
  label: string;
}): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Try it:</span>
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <button className="btn btn-primary" onClick={onClick}>
        {label}
      </button>
    </div>
  );
}
