import { EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";
import { FrogCryptoFolderName } from "@pcd/passport-interface";
import stringify from "fast-json-stable-stringify";
import toast from "react-hot-toast";
import styled from "styled-components";
import { useDispatch, usePCDsInFolder } from "../../src/appHooks";
import { H3 } from "../core";
import { BtnBase } from "../core/Button";
import { ActionButton } from "../screens/FrogScreens/Button";

export function FrogCryptoExportPCDsModal() {
  const dispatch = useDispatch();
  const pcds = usePCDsInFolder(FrogCryptoFolderName);

  return (
    <Container>
      <H3>Export Your FrogPCDs</H3>

      <p>
        Each Frog is a PCD (Proof Carry Data), with attributes securely signed
        by Zupass, making them tamper-proof. They are end-to-end encrypted,
        meaning they cannot be recovered without your password, including by
        Zupass.
      </p>
      <p>
        By clicking Download, you will receive an unencrypted, plaintext copy of
        all your Frogs. Although this file contains minimal sensitive
        information, we recommend safeguarding it for privacy reasons. It can be
        used to recover your FrogPCDs in case you forget your password or
        encounter a glitch in the universe.
      </p>

      <ActionButton
        ButtonComponent={BtnBase}
        onClick={async () => {
          try {
            const serialized = stringify(
              await Promise.all(pcds.map(EdDSAFrogPCDPackage.serialize))
            );
            const blob = new Blob([serialized], { type: "text/plaintext" });

            const elem = window.document.createElement("a");
            elem.href = window.URL.createObjectURL(blob);
            elem.download = `frogcrypto-pcds-${new Date().toISOString()}.txt`;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
          } catch (e) {
            console.error(e);
            toast.error(
              "There was an error saving your frogs. Maybe try again?"
            );
            return;
          }

          dispatch({
            type: "set-modal",
            modal: {
              modalType: "none"
            }
          });
        }}
      >
        Download
      </ActionButton>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  margin: 0 16px 16px 16px;
`;
