import { useState } from "react";
import { CenterColumn, TextCenter } from "../components/core";
import { Button } from "../components/screens/FrogScreens/Button";
import { AppContainer } from "../components/shared/AppContainer";
import { FloatingMenu } from "./FloatingMenu";
import { Input2 } from "./Input";
import { Ticket } from "./Ticket";
import { TicketCard } from "./TicketCard";
import { Button2 } from "./Button";

const ComponentsScreen = (): JSX.Element => {
  const [error, setError] = useState("");
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
        <FloatingMenu />
        <TextCenter>Hello, world!</TextCenter>
        <CenterColumn>
          <Input2 variant="secondary" placeholder="placeholder" error={error} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <Button2
              variant="danger"
              onClick={() => {
                if (error) {
                  setError("");
                } else {
                  setError("some generic error");
                }
              }}
            >
              test input{" "}
            </Button2>
            <Button2>primary</Button2>
            <Button2 variant="secondary">secondary</Button2>
          </div>
        </CenterColumn>
        <div style={{ display: "flex", flexDirection: "row", gap: 40 }}>
          <TicketCard
            title="DEVCON 2025"
            address="Bangkok, Thailand"
            ticketCount={3}
            cardColor="purple"
            imgSource="https://i.imgur.com/Fzs5N9T.jpeg"
            ticketDate="NOV. 12-15, 2024"
          />
          <TicketCard
            title="ETH Denver 2024"
            address="Denver, Colorado"
            ticketCount={1}
            cardColor="orange"
            imgSource="https://i.imgur.com/Fzs5N9T.jpeg"
            ticketDate="AUG. 13, 2022"
          />
        </div>
        <Ticket name="Richard Lu" type="Speaker" email="richard@0xparg.org" />
      </div>
    </AppContainer>
  );
};

export default ComponentsScreen;
