import {
  ChakraProvider,
  ColorModeScript,
  GlobalStyle,
  theme as chakraTheme,
  extendBaseTheme
} from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import { CheckinListPage } from "./pages/CheckinList";

const { Button, Modal, Table, Input } = chakraTheme.components;

const theme = extendBaseTheme({
  components: {
    Button,
    Modal,
    Table,
    Input
  }
});

// Create a client
const queryClient = new QueryClient();

function App(): JSX.Element {
  return (
    <React.StrictMode>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <GlobalStyle />
        <QueryClientProvider client={queryClient}>
          <CheckinListPage />
        </QueryClientProvider>
      </ChakraProvider>
    </React.StrictMode>
  );
}

const root = createRoot(
  document.querySelector("#root") as unknown as HTMLDivElement
);
root.render(<App />);
