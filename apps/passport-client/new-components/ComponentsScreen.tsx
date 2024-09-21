import { CenterColumn, TextCenter } from "../components/core";
import { AppContainer } from "../components/shared/AppContainer";
import { BigInput } from "./Input";
import { Ticket } from "./Ticket";
import { TicketCard } from "./TicketCard";

const ComponentsScreen = (): JSX.Element => {
  return (
    <AppContainer bg="gray">
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          gap: 40,
          padding: 40
        }}
      >
        <TextCenter>Hello, world!</TextCenter>
        <CenterColumn>
          <BigInput placeholder="placeholder" />
        </CenterColumn>
        <TicketCard
          title="DEVCON 2025"
          address="Bangkok, Thailand"
          ticketCount={3}
          cardColor="purple"
          imgSource="https://i.imgur.com/Fzs5N9T.jpeg"
        />
        <TicketCard
          title="ETH Denver 2024"
          address="Denver, Colorado"
          ticketCount={1}
          cardColor="orange"
          imgSource="https://i.imgur.com/Fzs5N9T.jpeg"
        />
        <Ticket name="Richard Lu" type="Speaker" email="richard@0xparg.org" />
      </div>
    </AppContainer>
  );
};

export default ComponentsScreen;
