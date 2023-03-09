import * as React from "react";
import { createRoot } from "react-dom/client";
import { Container } from "../components/core";
import { GenPassportScreen } from "../components/GenPassportScreen";
import { HomeScreen } from "../components/HomeScreen";
import { LoginScreen } from "../components/LoginScreen";
import { setSetState } from "../src/dispatch";
import { loadSelf } from "../src/participant";
import { ZuState } from "../src/state";

class App extends React.Component<{}, ZuState> {
  constructor(props: {}) {
    super(props);
    const self = loadSelf();
    this.state = {
      self,
      screen: self ? "home" : "login",
    };
  }

  componentDidMount(): void {
    setSetState(this.setState.bind(this));
  }

  render() {
    return <Container>{renderContents(this.state)}</Container>;
  }
}

function renderContents(state: ZuState) {
  const { screen } = state;
  switch (screen) {
    case "login":
      return <LoginScreen />;
    case "gen-passport":
      return <GenPassportScreen identity={state.identity} />;
    case "home":
      return <HomeScreen />;
    default:
      return <div>Missing: "{screen}"</div>;
  }
}

const root = createRoot(document.querySelector("#root"));
root.render(<App />);
