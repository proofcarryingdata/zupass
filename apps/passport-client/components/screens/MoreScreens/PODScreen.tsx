import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import { constructZupassPcdAddRequestUrl } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { POD, podEntriesFromSimplifiedJSON } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { randomUUID } from "@pcd/util";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useSelf } from "../../../src/appHooks";
import { NewButton } from "../../NewButton";
import { BigInput, H1, Placeholder } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

const PODAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const animate = useCallback((time: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = time;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const elapsed = (time - startTimeRef.current) % 2000; // Loop every 2 seconds
    const duration = 2000; // 2 seconds for the entire animation cycle

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set text properties
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Calculate opacity
    let opacity = 1;
    if (elapsed < duration / 2) {
      // Fade in
      opacity = Math.min(1, elapsed / (duration / 4));
    } else {
      // Fade out
      opacity = Math.max(0, 1 - (elapsed - duration / 2) / (duration / 4));
    }

    // Set color with opacity
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

    // Draw text
    const text = "POD";
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillText(text, x, y);

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        pointerEvents: "none"
      }}
    />
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
      <PODAnimation />
    </>
  );
}
