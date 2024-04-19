import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  a {
    text-decoration: underline !important;

    &:hover {
      color: #70dbff;
    }
  }
`;
