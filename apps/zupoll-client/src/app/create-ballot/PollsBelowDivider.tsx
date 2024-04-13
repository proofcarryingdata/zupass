export function PollsBelowDivider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-gray-300"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-2 text-sm text-foreground">
          Polls
        </span>
      </div>
    </div>
  );
}
