import { Button, Link } from "@chakra-ui/react";
import { ReactNode, useCallback } from "react";
import { Link as ReactLink, useLocation } from "react-router-dom";

export const PodboxButton = (): ReactNode => {
  const location = useLocation();

  return (
    <Link
      as={ReactLink}
      to="/dashboard"
      onClick={useCallback(() => {
        if (location.pathname === "/dashboard") {
          window.location.reload();
        }
      }, [location.pathname])}
    >
      <Button>
        <span style={{ fontSize: "20pt" }}>📦</span>
        &nbsp;&nbsp;
        <span>Podbox</span>
      </Button>
    </Link>
  );
};
