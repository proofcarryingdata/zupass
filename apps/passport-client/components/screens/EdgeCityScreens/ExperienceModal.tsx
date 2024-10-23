import { EdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import _ from "lodash";
import styled from "styled-components";
import { Button } from "../../core";
import { AdhocModal } from "../../modals/AdhocModal";
import { PCDCard } from "../../shared/PCDCard";

export function ExperienceModal({
  pcd,
  color,
  isContact,
  isStar,
  onClose
}: {
  pcd: EdDSATicketPCD;
  color: string;
  isContact?: boolean;
  isStar?: boolean;
  onClose: () => void;
}): JSX.Element {
  // see:
  //   - LemonadePipeline#getReceivedContactsForEmail
  //   - LemonadePipeline#getReceivedBadgesForEmail
  //
  // ... for context on where these come from
  const altText = pcd?.claim?.ticket?.imageAltText;
  const email = pcd?.claim?.ticket?.attendeeEmail;

  return (
    <AdhocModal
      open={!!pcd}
      onClose={onClose}
      center
      styles={{
        modal: {
          maxWidth: "400px",
          border: "1px solid #5e5e5e",
          borderRadius: "8px",
          padding: "8px"
        }
      }}
    >
      <Container index={0} count={1} color={color}>
        <PCDCard pcd={pcd} expanded hideRemoveButton />
        {isContact && altText && altText !== "" && (
          <Button
            onClick={(): void => {
              window.location.href = altText;
            }}
          >
            Actions
          </Button>
        )}
        {isStar && altText && altText !== "" && email && email !== "" && (
          <Button
            onClick={(): void => {
              window.location.href = altText;
            }}
          >
            from: {email}
          </Button>
        )}
      </Container>
    </AdhocModal>
  );
}

const Container = styled.div<{ index: number; count: number; color: string }>`
  padding: 16px;

  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
  justify-content: space-around;

  > div > div {
    padding: 0;
    border: 1px solid ${({ color }): string => color};
    box-shadow: ${({ index, count, color }): string => {
      return [..._.range(-1, -index - 1, -1), ..._.range(1, count - index)]
        .map((i) => {
          const offset = i * 2;

          return [
            `${offset}px ${offset}px 2px -1px white`,
            `${offset}px ${offset}px 2px 0 ${color}`
          ];
        })
        .join(", ");
    }};
  }
`;
