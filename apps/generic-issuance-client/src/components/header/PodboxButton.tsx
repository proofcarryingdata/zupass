import { Button } from "@chakra-ui/react";
import { ReactNode, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { PodLink } from "../Core";

export const PodboxButton = (): ReactNode => {
  const location = useLocation();

  return (
    <PodLink
      to="/dashboard"
      onClick={useCallback(() => {
        if (location.pathname === "/dashboard") {
          window.location.reload();
        }
      }, [location.pathname])}
    >
      <Button variant="outline">
        <span style={{ fontSize: "20pt" }}>📦</span>
        &nbsp;&nbsp;
        <span>Podbox</span>
      </Button>
    </PodLink>
  );
};
