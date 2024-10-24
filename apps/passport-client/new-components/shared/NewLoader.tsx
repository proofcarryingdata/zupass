import { ReactElement, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

type LoaderProps = {
  rows?: number;
  columns?: number;
  color?: string;
};

const Rect = styled.div<{ active: boolean; color: string }>`
  width: 8px;
  height: 8px;
  background: ${({ color }): string => color};
  opacity: ${({ active }): number => (active ? 1 : 0.2)};
`;

const Container = styled.div<{ rows: number; columns: number }>`
  display: grid;
  place-items: center;
  grid-template-rows: repeat(${({ rows }): number => rows}, 8px);
  grid-template-columns: repeat(${({ columns }): number => columns}, 8px);
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

export const NewLoader = ({
  rows = 5,
  columns = 5,
  color
}: LoaderProps): ReactElement => {
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

        row.push(
          <Rect
            key={`${i}-${j}`}
            active={isActive}
            color={color ?? "var(--text-tertiary)"}
          />
        );
      }
      comp.push(row);
    }
    return comp;
  }, [rows, columns, noise, color]);
  return (
    <Container rows={rows} columns={columns}>
      {grid}
    </Container>
  );
};
