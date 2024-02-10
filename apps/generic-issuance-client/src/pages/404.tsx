import { Link } from "@chakra-ui/react";
import { ReactNode } from "react";
import { Link as ReactLink } from "react-router-dom";
import { PageContent } from "../components/Core";
import { Header } from "../components/Header";

export function NotFound(): ReactNode {
  return (
    <>
      <Header />
      <PageContent>
        This page doesn't exist. <br />
        <Link as={ReactLink} to="/">
          Go to Podbox
        </Link>
      </PageContent>
    </>
  );
}
