import { IoIosArrowBack } from "react-icons/io";
import styled from "styled-components";
import { Button } from "../core";

export function ScreenNavigation({
  to,
  label
}: {
  to: string;
  label: string;
}): JSX.Element {
  return (
    <Container>
      <a href={"/#" + to}>
        <Button size="large" style="outline">
          <ContentsWrapper>
            <IoIosArrowBack size={18} />
            <span>{label}</span>
          </ContentsWrapper>
        </Button>
      </a>
    </Container>
  );
}

export function BackButton({ label }: { label?: string }): JSX.Element {
  return (
    <Button
      styles={{ marginTop: "-8px" }}
      size="large"
      style="outline"
      onClick={() => window.history.back()}
    >
      <ContentsWrapper>
        <IoIosArrowBack size={18} />
        <span>{label ?? "Back"}</span>
      </ContentsWrapper>
    </Button>
  );
}

const Container = styled.div`
  margin-top: 24px;
  width: 100%;

  a {
    text-decoration: none;
  }
`;

const ContentsWrapper = styled.div`
  justify-content: center;
  align-items: center;
  display: inline-flex;
  color: white;
  gap: 4px;
  font-size: 11pt;
  margin-right: 10px;
`;
