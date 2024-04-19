import { Card } from "@/components/ui/card";
import { FaEyeSlash, FaUnlink, FaVoteYea } from "react-icons/fa";
import styled from "styled-components";

export function GuaranteesElement() {
  return (
    <GuaranteeContainer className="text-sm">
      <Card className="w-1/3">
        <Guarantee>
          <FaEyeSlash size={"14px"} /> The server never learns your identity.
        </Guarantee>
      </Card>
      <Card className="w-1/3">
        <Guarantee>
          <FaVoteYea size={"14px"} /> One vote per participant.
        </Guarantee>
      </Card>
      <Card className="w-1/3">
        <Guarantee>
          <FaUnlink size={"12px"} /> Unlinkable votes across ballots/devices.
        </Guarantee>
      </Card>
      <>
        {/* <Guarantee>
          <FaPerson width={"14px"} /> Login Status: {loginState.config.name}
        </Guarantee> */}
      </>
    </GuaranteeContainer>
  );
}

const GuaranteeContainer = styled.div`
  width: 110%;
  margin-left: -5%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-direction: row;
  gap: 16px;
  box-sizing: border-box;
`;

const Guarantee = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-sizing: border-box;
  margin-bottom: 0.5rem;
  padding: 16px;
  gap: 1rem;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  flex-direction: column;
`;
