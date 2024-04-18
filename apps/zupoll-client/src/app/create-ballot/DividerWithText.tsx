export function DividerWithText({ children }: React.PropsWithChildren) {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border border-gray-200 dark:border-green-950/50 border-dashed"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-2 text-sm text-foreground text-gray-900 dark:text-foreground">
          {children}
        </span>
      </div>
    </div>
  );
}
