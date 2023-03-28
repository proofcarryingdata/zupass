import { GlobalStyle } from "../components/GlobalStyle";

const App = ({ Component, pageProps }: { Component: any; pageProps: any }) => {
  return (
    <>
      <GlobalStyle />
      <Component {...pageProps} />;
    </>
  );
};

export default App;
