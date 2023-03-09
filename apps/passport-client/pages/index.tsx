import * as React from "react";
import { createRoot } from "react-dom/client";
import { Container } from "../components/core";
import { HomeScreen } from "../components/HomeScreen";
import { LoginScreen } from "../components/LoginScreen";
import { dispatch, setSetState, ZuState } from "../src/dispatch";

class App extends React.Component<{}, ZuState> {
  state = {
    test: false,
  };

  componentDidMount(): void {
    setSetState((s: ZuState) => this.setState(s));
  }

  render() {
    return <Container>{this.renderContents()}</Container>;
  }

  renderContents() {
    const { test } = this.state;
    if (!test) return <LoginScreen {...{ dispatch }} />;
    return <HomeScreen />;
  }
}

const root = createRoot(document.body);
root.render(<App />);
