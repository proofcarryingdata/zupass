import { createGlobalStyle } from "styled-components";
import { JellyPage } from "../components/JellyPage";

export default function Web() {
  return (
    <div>
      <GlobalStyle />
      {/* <h1>0xPARC Goerli Testnet Eth Faucet</h1>
      <div>
        check if your account is eligible
        <input type="text" />
        <button>check</button>
      </div>
      <div>
        check if your public key is eligible
        <input type="text" />
        <button>check</button>
      </div>
      <div>
        submit proof
        <textarea />
        <button>submit</button>
      </div> */}
      <JellyPage />
    </div>
  );
}

const GlobalStyle = createGlobalStyle`
body {
  margin: 0;
}`;
