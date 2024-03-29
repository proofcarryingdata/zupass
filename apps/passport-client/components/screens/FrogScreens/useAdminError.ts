import { useEffect } from "react";

export function useAdminError(error: string | undefined): void {
  useEffect(() => {
    if (error && error?.includes("not authorized")) {
      alert("you're not admin, bye bye");
      window.location.replace("/");
    }
  }, [error]);
}
