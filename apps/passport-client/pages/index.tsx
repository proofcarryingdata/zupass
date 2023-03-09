import * as React from "react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Container } from "../components/core";
import { HomeScreen } from "../components/HomeScreen";
import { LoginScreen } from "../components/LoginScreen";
import { dispatch, setSetState, ZuState } from "../src/dispatch";

function App() {
  const [state, setState] = useState<ZuState>({ test: false });
  setSetState(setState);
  return <Container>{renderContents(state)}</Container>;
}

function renderContents(state: ZuState) {
  const { test } = this.state;
  if (!test) return <LoginScreen {...{ dispatch }} />;
  return <HomeScreen />;
}

const root = createRoot(document.body);
root.render(<App />);
