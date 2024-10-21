import styled from "styled-components";
import { Typography } from "../../new-components/shared/Typography";
import { AppContainer } from "../shared/AppContainer";
import { Button2 } from "../../new-components/shared/Button";

export function MissingScreen(): JSX.Element {
  return (
    <AppContainer bg="gray" fullscreen>
      <MissingScreenContainer>
        <ContentContainer>
          <TitleContainer>
            <Four />
            <Zero />
            <Four />
          </TitleContainer>
          <Typography
            family="Rubik"
            fontSize={14}
            fontWeight={400}
            color={"var(--text-tertiary)"}
          >
            This page cannot be found
          </Typography>
        </ContentContainer>
        <Button2
          variant="secondary"
          onClick={() => {
            window.location.href = "/#";
          }}
        >
          Return home
        </Button2>
      </MissingScreenContainer>
    </AppContainer>
  );
}

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const MissingScreenContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin: auto 0;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 18px;
`;

const Shape = ({ pattern }: { pattern: number[][] }): JSX.Element => {
  return (
    <RectContainer>
      {pattern.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <div key={`${rowIndex}-${colIndex}`}>
            {cell === 1 ? <Rect /> : <Spacer />}
          </div>
        ))
      )}
    </RectContainer>
  );
};

const Four = (): JSX.Element => {
  const pattern = [
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 1]
  ];

  return <Shape pattern={pattern} />;
};

const Zero = (): JSX.Element => {
  const pattern = [
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1]
  ];

  return <Shape pattern={pattern} />;
};

const RectContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 8px);
  grid-template-rows: repeat(5, 8px);
  gap: 5px;
`;

const Rect = styled.div`
  width: 8px;
  height: 8px;
  background: var(--text-tertiary);
`;

const Spacer = styled.div`
  width: 8px;
  height: 8px;
`;
