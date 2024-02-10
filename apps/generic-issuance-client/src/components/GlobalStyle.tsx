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

  input {
    background-color: #111111;
    color: #d6d6d6;
    padding: 2px;
    border: 1px solid #d6d6d6;
  }
`;
