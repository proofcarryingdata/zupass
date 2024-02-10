import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  html {
  }

  body {
    margin: 0;
    line-height: 1.5em;
  }

  p, ul, ol {
    max-width: 600px;
  }

  input {
    background-color: #111111;
    color: #d6d6d6;
    padding: 2px;
    border: 1px solid #d6d6d6;
  }
`;
