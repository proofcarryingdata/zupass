import { useEffect } from "react";

export function useAdminError(error: string): void {
  useEffect(() => {
    if (error?.includes("not authorized")) {
      alert("you're not admin, bye bye");
      window.location.replace("/");
    }
  }, [error]);
}
