import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PageContent } from "../components/Core";
import { Header } from "../components/Header";

export function NotFound(): ReactNode {
  return (
    <>
      <Header />
      <PageContent>
        This page doesn't exist. <br />
        <Link to="/">Go to Podbox</Link>
      </PageContent>
    </>
  );
}
