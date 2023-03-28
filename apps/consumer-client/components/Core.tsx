import Link from "next/link";
import styled from "styled-components";

export const Container = styled.div`
  font-family: system-ui, sans-serif;
  border: 1px solid black;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
`;

export const HomeLink = () => {
  return <Link href={"/"}>Home</Link>;
};
