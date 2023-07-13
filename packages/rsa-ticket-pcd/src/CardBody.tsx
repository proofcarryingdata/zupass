import styled from "styled-components";
import { RSATicketPCD } from "./RSATicketPCD";

export function RSATicketCardBody({ pcd }: { pcd: RSATicketPCD }) {
  return <Container>this is a ticket</Container>;
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
