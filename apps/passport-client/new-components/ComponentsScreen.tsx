import { useState } from "react";
import { CenterColumn, TextCenter } from "../components/core";
import { AppContainer } from "../components/shared/AppContainer";
import { Avatar } from "./Avatar";
import { Button2 } from "./Button";
import { FloatingMenu } from "./FloatingMenu";
import { Input2 } from "./Input";
import { List } from "./List/List";
import { Ticket } from "./Ticket";
import { TicketCard } from "./TicketCard";
import { SettingsBottomModal } from "./settingsBottomModal";

const ComponentsScreen = (): JSX.Element => {
  const [error, setError] = useState("");
  return (
    <AppContainer bg="gray">
      {/* We need to reconsider the MaybeModal concept, not sure we will apply the same for bottom-modal */}
      <SettingsBottomModal />
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
          <div>
            <Avatar imgSrc={"https://i.imgur.com/Fzs5N9T.jpeg"} />
          </div>
          <div
            style={{
              margin: 12
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 40,
                width: 370,
                height: 630
              }}
            >
              <List
                list={[
                  {
                    title: "Event Passes",
                    children: [
                      {
                        title: "Devcon Pass",
                        LeftIcon: (
                          <Avatar imgSrc="https://i.imgur.com/Fzs5N9T.jpeg" />
                        )
                      },
                      {
                        title: "Berlin Event Pass"
                      },
                      {
                        title: "Denver Event Pass"
                      }
                    ]
                  },
                  {
                    title: "Puddle Crypto",
                    children: [
                      {
                        title: "American Bullfrog",
                        LeftIcon: (
                          <Avatar
                            imgSrc={`https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.nrdc.org%2Fsites%2Fdefault%2Ffiles%2Fstyles%2Fmedium_100%2Fpublic%2Fmedia-uploads%2F02_b3ewye_2400.jpg.jpg%3Fitok%3D4cywc1Uq&f=1&nofb=1&ipt=d994e52f175331180fca4072983909856868e3f3687df2475a18206a29a2b29b&ipo=images`}
                          />
                        )
                      },
                      {
                        title: "Wood Frog",
                        LeftIcon: (
                          <Avatar
                            imgSrc={`https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fmiro.medium.com%2Fv2%2Fresize%3Afit%3A1200%2F1*EKAWH3tIOEed1vSrzzhDpg.jpeg&f=1&nofb=1&ipt=af41ba48a56ef7af73a0f953d337053dfd6f0e69963763ef2eafd55d489b4b72&ipo=images`}
                          />
                        )
                      }
                    ]
                  },
                  {
                    title: "FrogCraiglist",
                    children: [
                      {
                        title: "Digital Chair Listing"
                      }
                    ]
                  }
                ]}
              />
            </div>
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
