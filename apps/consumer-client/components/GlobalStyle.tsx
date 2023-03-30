import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  body {
    font-family: sans-serif;
    margin: 32px;
    line-height: 1.5em;
  }

  p {
    max-width: 600px;
  }

  button {
    cursor: pointer;
  }
`;
