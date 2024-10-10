import { QRDisplay } from "@pcd/passport-ui";
import styled from "styled-components";
import { Typography } from "./Typography";

const TicketBody = styled.div`
  display: flex;
  flex-direction: column;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
`;

const QRWrapper = styled.div`
  width: 250px;
  height: 250px;
  border-radius: 12px;
  background-color: white;
`;

const TicketDetails = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
`;

interface TicketProps {
  name: string;
  type: "Speaker" | "General";
  email: string;
}
export const Ticket = ({ name, type, email }: TicketProps): JSX.Element => {
  return (
    <TicketBody>
      <QRWrapper>
        <QRDisplay value="mock" saved={true} />;
      </QRWrapper>
      <TicketDetails>
        <Typography
          fontSize={18}
          fontWeight={800}
          color={"rgba(154, 74, 201, 1)"}
        >
          {name.toUpperCase()}
        </Typography>
        <Typography fontSize={16} fontWeight={500}>
          {type}
        </Typography>
        <Typography fontSize={14} fontWeight={400}>
          {email}
        </Typography>
        <Typography fontSize={14} fontWeight={400} opacity={0.4} underline>
          Share ticket
        </Typography>
      </TicketDetails>
    </TicketBody>
  );
};
