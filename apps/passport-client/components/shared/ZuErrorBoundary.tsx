import { ErrorBoundary } from "@rollbar/react";
import React from "react";

export function ZuErrorBoundary({ children }: { children: React.ReactNode }) {
  const FallbackUI = () => {
    console.log("App caught error", error);
    const { message, stack } = error;
    let shortStack = stack.substring(0, 280);
    if (shortStack.length < stack.length) shortStack += "...";
    return {
      error: { title: "Error", message, stack: shortStack },
    } as Partial<ZuState>;
  };

  return <ErrorBoundary fallbackUI={FallbackUI}>{children}</ErrorBoundary>;
}
