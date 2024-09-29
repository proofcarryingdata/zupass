import { ReactElement, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

type LoaderProps = {
  rows: number;
  columns: number;
};

const Rect = styled.div<{ active: boolean }>`
  width: 8px;
  height: 8px;
  background: var(--text-tertiary, #8b94ac);
  opacity: ${({ active }): number => (active ? 1 : 0.2)};
`;

const Container = styled.div`
  display: grid;
  place-items: center;
  grid-template-rows: repeat(5, 8px);
  grid-template-columns: repeat(5, 8px);
  gap: 5px;
`;

const generateStaticNoise = (rows: number, columns: number): number[][] => {
  const noise = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < columns; j++) {
      row.push(Math.random());
    }
    noise.push(row);
  }
  return noise;
};

export const NewLoader = ({ rows, columns }: LoaderProps): ReactElement => {
  const [noise, setNoise] = useState(generateStaticNoise(rows, columns));
  useEffect(() => {
    const intervalId = setInterval(() => {
      setNoise(generateStaticNoise(rows, columns));
    }, 100);
    return (): void => clearInterval(intervalId);
  }, [rows, columns]);
  const grid = useMemo(() => {
    const comp = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < columns; j++) {
        const isActive = noise[i][j] > 0.65;

        row.push(<Rect key={`${i}-${j}`} active={isActive} />);
      }
      comp.push(row);
    }
    return comp;
  }, [rows, columns, noise]);
  return <Container>{grid}</Container>;
};
