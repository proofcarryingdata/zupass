import { Heading } from "@chakra-ui/react";
import { ErrorBoundary } from "@rollbar/react";
import { ReactNode } from "react";
import styled from "styled-components";
import { PageContent } from "./Core";
import { GlobalPageHeader } from "./header/GlobalPageHeader";

const ErrorDisplay = ({
  error
}: {
  error;
  resetError: () => void;
}): ReactNode => (
  <>
    <GlobalPageHeader />
    <PageContent>
      <Heading size="md">Error rendering page</Heading>
      <ErrorStackPre>
        {error.toString()}
        {"\n"}
        {error.stack}
      </ErrorStackPre>
    </PageContent>
  </>
);

export function PodboxErrorBoundary({
  children
}: {
  children?: ReactNode | ReactNode[];
}): ReactNode {
  return <ErrorBoundary fallbackUI={ErrorDisplay}>{children}</ErrorBoundary>;
}

const ErrorStackPre = styled.pre`
  font-size: 12pt;
  font-family: Inconsolata, monspace;
`;
