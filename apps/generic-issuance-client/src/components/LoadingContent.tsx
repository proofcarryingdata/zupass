import { Spinner } from "@chakra-ui/react";
import { ReactNode } from "react";
import styled from "styled-components";
import { PageContent } from "./Core";

export function LoadingContent(): ReactNode {
  return (
    <PageContent>
      <Container>
        <Spinner />
      </Container>
    </PageContent>
  );
}

const Container = styled.div`
  min-height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
`;
