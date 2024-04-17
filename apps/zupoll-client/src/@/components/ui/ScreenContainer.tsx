export function ScreenContainer({ children }: React.PropsWithChildren) {
  return (
    <div className="w-full h-screen min-h-screen max-h-screen overflow-hidden overflow-y-scroll">
      {children}
    </div>
  );
}
