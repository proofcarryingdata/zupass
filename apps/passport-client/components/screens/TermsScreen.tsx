import styled, { createGlobalStyle } from "styled-components";
import { PrivacyNoticeText } from "../shared/PrivacyNotice";

export function TermsScreen(): JSX.Element {
  return (
    <Container>
      <GlobalStyle />
      <TextContainer>
        <PrivacyNoticeText />
      </TextContainer>
    </Container>
  );
}

const GlobalStyle = createGlobalStyle`
  html {
    background-color: white;
  }
`;

const TextContainer = styled.div`
  max-width: 800px;
`;

const Container = styled.div`
  min-height: 100vh;
  color: black;
  padding: 64px 32px;
  display: flex;
  justify-content: center;
  align-items: center;
`;
