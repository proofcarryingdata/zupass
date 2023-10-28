import { ZUCONNECT_PRODUCT_ID_MAPPINGS } from "@pcd/passport-interface";
import styled from "styled-components";
import {
  CardContainerExpanded,
  CardHeader,
  CardOutlineExpanded
} from "../PCDCard";

export function ZuconnectKnownTicketDetails({
  productId,
  publicKeyName,
  ticketName
}: {
  productId: string;
  publicKeyName: string;
  ticketName: string | undefined;
}) {
  const type = Object.entries(ZUCONNECT_PRODUCT_ID_MAPPINGS).find(
    ([_name, product]) => product.id === productId
  )[0];
  return (
    <CardContainerExpanded>
      <CardOutlineExpanded>
        <CardHeader col="var(--accent-lite)">
          <VerifyLine>
            VERIFIED <strong>ZUCONNECT '23</strong> TICKET
          </VerifyLine>
          <VerifyLine>
            {(ticketName ?? type).split("\n").map((line) => {
              return <NameLine>{line}</NameLine>;
            })}
          </VerifyLine>
          <VerifyLine>SIGNED BY: {publicKeyName}</VerifyLine>
        </CardHeader>
      </CardOutlineExpanded>
    </CardContainerExpanded>
  );
}

const VerifyLine = styled.div`
  text-transform: capitalize;
  margin: 12px 0px;
`;

const NameLine = styled.p`
  margin: 2px 0px;
`;
