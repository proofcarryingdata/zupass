import * as React from "react";
import { DispatchContext } from "../src/dispatch";
import { GenPassportScreen } from "./GenPassportScreen";
import { HomeScreen } from "./HomeScreen";
import { LoginScreen } from "./LoginScreen";

export function IndexScreen() {
  const [state] = React.useContext(DispatchContext);
  switch (state.screen) {
    case "login":
      return <LoginScreen />;
    case "gen-passport":
      return <GenPassportScreen identity={state.identity} />;
    case "home":
      return <HomeScreen />;
    default:
      return <div>Missing {state.screen}</div>;
  }
}
