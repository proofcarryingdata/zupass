import { useEffect } from "react";

export function useAdminError(error: string) {
  useEffect(() => {
    if (error?.includes("not authorized")) {
      alert("you're not admin, bye bye");
      window.location.replace("/");
    }
  }, [error]);
}
