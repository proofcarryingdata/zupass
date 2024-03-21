import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
th {
  /* font-family: Inconsolata, monospace !important;
  font-size: 12pt !important;
  font-weight: normal !important; */
}

a {
  text-decoration: underline !important;

  &:hover {
    color: #70dbff;
  }
}
`;
