import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import { constructZupassPcdAddRequestUrl } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { POD, podEntriesFromSimplifiedJSON } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { randomUUID } from "@pcd/util";
import { ReactNode, useCallback, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useSelf } from "../../../src/appHooks";
import { NewButton } from "../../NewButton";
import { BigInput, H1, Placeholder } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

const PODAnimation: React.FC = () => {
  const text = useMemo(() => new Array(300).fill("POD").join(" "), []);

  const rows = useMemo(() => {
    const res: ReactNode[] = [];
    for (let i = 0; i < 50; i++) {
      if (i % 2 === 0) {
        res.push(<XDContainer key={i}>{text}</XDContainer>);
      } else {
        res.push(<JiggleContainer key={i}>{text}</JiggleContainer>);
      }
    }
    return res;
  }, [text]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
        whiteSpace: "nowrap",
        opacity: 0.1
      }}
    >
      {rows}
    </div>
  );
};

export function PODScreen(): ReactNode {
  const self = useSelf();
  const [title, setTitle] = useState("THE QUICK CLOWN");
  const [description, setDescription] = useState(
    "JUMPED OVER THE LAZY ZERO KNOWLEDGE PROOF"
  );
  const [image, setImage] = useState(
    "https://upload.wikimedia.org/wikipedia/commons/a/a5/Auguste_clown_reading_a_book_upside-down.jpg"
  );

  const onCreateClick = useCallback(() => {
    async function addPODPCD(
      podContent: string,
      podPrivateKey: string,
      podFolder: string | undefined,
      redirectToFolder?: boolean
    ): Promise<void> {
      const newPOD = new PODPCD(
        randomUUID(),
        POD.sign(podEntriesFromSimplifiedJSON(podContent), podPrivateKey)
      );

      const serializedPODPCD = await PODPCDPackage.serialize(newPOD);

      const url = constructZupassPcdAddRequestUrl(
        window.location.origin,
        window.location.origin,
        serializedPODPCD,
        podFolder,
        false,
        redirectToFolder
      );

      open(url);
    }

    const EXAMPLE_POD_CONTENT_WITH_DISPLAY = `{
      "zupass_display": "collectable",
      "zupass_image_url": "${image}",
      "zupass_title": "${title}",
      "zupass_description": "${description}",
      "owner": ${self?.commitment}
    }`;

    addPODPCD(
      EXAMPLE_POD_CONTENT_WITH_DISPLAY,
      newEdDSAPrivateKey(),
      undefined
    );
  }, [description, image, self?.commitment, title]);

  return (
    <>
      <MaybeModal />
      <PODAnimation />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3">
          <H1 className="">
            POD PASS POD PASS POD PASS POD PASS POD PASS POD PASSPOD PASS POD
            PASS POD PASS
          </H1>
        </div>
        <Spacer h={24} />
        <Placeholder minH={540}>
          <div className="flex flex-col gap-2">
            <NewButton
              onClick={() => {
                window.location.href = "#/more";
              }}
            >
              Back
            </NewButton>

            <BigInput
              placeholder="POD Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <BigInput
              placeholder="POD Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <BigInput
              placeholder="POD IMAGE"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />

            <NewButton onClick={onCreateClick}>CREATE POD</NewButton>
          </div>
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}

const jiggle = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(5px); }
`;

const xd = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-5px); }
`;

const JiggleContainer = styled.div`
  animation: ${jiggle} 200ms ease-in-out infinite alternate;
`;

const XDContainer = styled.div`
  animation: ${xd} 200ms ease-in-out infinite alternate;
`;
