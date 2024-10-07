import { PCD } from "@pcd/pcd-types";
import { ReactElement } from "react";
import styled from "styled-components";
import { CardBody } from "../../../components/shared/PCDCard";

const Container = styled.div`
  border-radius: 16px;
  border: 2px solid var(--text-white, #fff);
  background: var(--bg-white-transparent, rgba(255, 255, 255, 0.8));

  /* shadow-sm */
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
`;
export const HomeTicket = (props: { pcd: PCD }): ReactElement => {
  const { pcd } = props;
  return (
    <Container>
      <CardBody pcd={pcd} isMainIdentity={false} />
    </Container>
  );
};
