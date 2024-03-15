import { ReactNode } from "react";
import { PageContent, PodLink } from "../components/Core";
import { GlobalPageHeader } from "../components/header/GlobalPageHeader";

export function NotFound(): ReactNode {
  return (
    <>
      <GlobalPageHeader />
      <PageContent>
        This page doesn't exist. <br />
        <PodLink to="/">Go to Zubox</PodLink>
      </PageContent>
    </>
  );
}
