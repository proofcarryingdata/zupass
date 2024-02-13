import { Spinner } from "@chakra-ui/react";
import { ReactNode } from "react";
import styled from "styled-components";
import { PageContent } from "./Core";

/**
 * {@link PageContent} wrapping a big rectangle with a {@link Spinner}
 * in the middle of it.
 */
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
