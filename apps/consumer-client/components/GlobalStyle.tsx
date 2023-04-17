import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  html {
    background-color: #111111;
    color: #d6d6d6;
  }

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
    background-color: #0f2e41;
    color: white;
    padding: 4px 16px;
    border: 1px solid #15405b;
    border-radius: 4px;
    margin: 4px;

    &:hover {
      background-color: #10344a;
    }
  }

  a:visited {
    color: #8564ff;
  }
`;
