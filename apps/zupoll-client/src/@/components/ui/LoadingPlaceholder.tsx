import { Spinner } from "./spinner";

export function LoadingPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-40">
      <Spinner className="w-8 h-8" />
    </div>
  );
}
