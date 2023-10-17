import { ZUCONNECT_PRODUCT_ID_MAPPINGS } from "@pcd/passport-interface";
import styled from "styled-components";
import {
  CardContainerExpanded,
  CardHeader,
  CardOutlineExpanded
} from "../PCDCard";

export function ZuconnectKnownTicketDetails({
  productId,
  publicKeyName
}: {
  productId: string;
  publicKeyName: string;
}) {
  const type = Object.entries(ZUCONNECT_PRODUCT_ID_MAPPINGS).find(
    ([_name, product]) => product.id === productId
  )[0];
  return (
    <CardContainerExpanded>
      <CardOutlineExpanded>
        <CardHeader col="var(--accent-lite)">
          <div>VERIFIED ZUCONNECT '23 TICKET</div>
          <div>SIGNED BY: {publicKeyName}</div>
          <ZuzaluRole>TYPE: {type}</ZuzaluRole>
        </CardHeader>
      </CardOutlineExpanded>
    </CardContainerExpanded>
  );
}

const ZuzaluRole = styled.div`
  text-transform: uppercase;
`;
