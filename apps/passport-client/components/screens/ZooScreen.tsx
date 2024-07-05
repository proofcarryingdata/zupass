// let localStream = null;
// let remoteStream = null;

import {
  CircleButton,
  QRDisplayWithRegenerateAndStorage
} from "@pcd/passport-ui";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaRegCopy } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import init, {
  state0_bindgen,
  state1_bindgen,
  state2_bindgen,
  state3_bindgen,
  state4_bindgen
} from "../../src/mp-psi";
import { PeerConnection } from "../../src/webRTC";
import { Button, H1, Spacer, TextCenter } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";
import { ScreenLoader } from "../shared/ScreenLoader";

function randomBitVector(length: number): number[] {
  const arr = [];
  for (let i = 0; i < length; i++) {
    arr.push(Math.round(Math.random()));
  }
  return arr;
}
async function sendConnectionChunked(
  id: string,
  data: { state: 0 | 1 | 2 | 3; message: object },
  chunkSize: number
): Promise<void> {
  const messageSerialized = JSON.stringify(data.message);
  for (let i = 0; i < messageSerialized.length; i += chunkSize) {
    await PeerConnection.sendConnection(id, {
      state: data.state,
      message: messageSerialized.slice(i, i + chunkSize),
      last: i >= messageSerialized.length - chunkSize
    });
  }
}

const animals = [
  { name: "FROG", emoji: "🐸" },
  { name: "KOALA", emoji: "🐨" },
  { name: "PANDA", emoji: "🐼" },
  { name: "GECKO", emoji: "🦎" },
  { name: "HOG", emoji: "🦔" }
];

export default function ZooScreen(): JSX.Element {
  const [query] = useSearchParams();
  const target = query.get("target");
  const [id, setId] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [bits, setBits] = useState(randomBitVector(5));
  const handleBitsChange = (index: number): void => {
    setBits((prevBits) => {
      const newBits = [...prevBits];
      newBits[index] = newBits[index] === 0 ? 1 : 0;
      return newBits;
    });
  };
  const [connected, setConnected] = useState(false);
  const prevState = useRef<{
    key: 0 | 1 | 2;
    value: Record<string, object>;
  }>();
  const [psi, setPsi] = useState<number[]>();

  const chunkBuffers: Record<string, string[]> = {};

  const bits32 = new Uint32Array(bits);

  async function startSession(): Promise<void> {
    if (id) return;
    setLoading(true);
    await init();
    console.log("4");
    const peerId = await PeerConnection.startPeerSession();
    setId(peerId);
    PeerConnection.onIncomingConnection((conn) => {
      // Peer B
      const peerId = conn.peer;
      console.log("Incoming connection: " + peerId);
      setConnected(true);

      PeerConnection.onConnectionDisconnected(peerId, () => {
        console.log("Connection closed: " + peerId);
        setConnected(false);
      });
      PeerConnection.onConnectionReceiveData(peerId, async (data) => {
        console.log("Receiving data ", { data });

        if (!chunkBuffers[peerId]) {
          chunkBuffers[peerId] = [];
        }

        chunkBuffers[peerId].push(data.message);

        if (data.last) {
          const completeMessage = chunkBuffers[peerId].join("");
          chunkBuffers[peerId] = []; // Clear the buffer for this peerId

          const parsedMessage = JSON.parse(completeMessage);

          if (data.state === 0) {
            console.log("doing stage 1", { data, parsedMessage, prevState });
            const state1 = state1_bindgen(parsedMessage, bits32);

            await sendConnectionChunked(
              peerId,
              {
                state: 1,
                message: state1.message_b_to_a
              },
              8 * 1024
            );
            prevState.current = { key: 1, value: state1 };
          } else if (data.state === 2 && prevState.current?.key === 1) {
            console.log("doing stage 3", { data, parsedMessage, prevState });
            const state3 = state3_bindgen(
              prevState.current.value.private_output_b,
              prevState.current.value.public_output_b,
              parsedMessage
            );

            await sendConnectionChunked(
              peerId,
              {
                state: 3,
                message: state3.message_b_to_a
              },
              8 * 1024
            );
            setPsi([...state3.psi_output].slice(0, 10));
          } else {
            console.error(
              "unrecognized or invalid state:",
              data.state,
              prevState
            );
          }
        }
      });
    });
    if (target) {
      await startTarget();
    } else {
      setLoading(false);
    }
  }

  async function startTarget(): Promise<void> {
    console.log("startTarget", { bits, target, prevState, connected, id });
    if (connected) return;
    if (target) {
      // Peer A
      await PeerConnection.connectPeer(target);
      console.log("doing stage 0");
      const state0 = state0_bindgen();
      console.log("done stage 0");
      PeerConnection.onConnectionDisconnected(target, () => {
        console.log("Connection closed: " + target);
        setConnected(false);
      });
      console.log("added onConnectionDisconnected");

      if (!chunkBuffers[target]) {
        chunkBuffers[target] = [];
      }

      PeerConnection.onConnectionReceiveData(target, async (data) => {
        console.log("Receiving data ", { data });

        chunkBuffers[target].push(data.message);

        if (data.last) {
          const completeMessage = chunkBuffers[target].join("");
          chunkBuffers[target] = []; // Clear the buffer for this target

          const parsedMessage = JSON.parse(completeMessage);

          if (data.state === 1) {
            console.log("doing stage 2", { data, prevState });
            const state2 = state2_bindgen(
              state0.private_output_a,
              state0.public_output_a,
              parsedMessage,
              bits32
            );

            await sendConnectionChunked(
              target,
              {
                state: 2,
                message: state2.message_a_to_b
              },
              8 * 1024
            );
            prevState.current = { key: 2, value: state2 };
          } else if (data.state === 3 && prevState.current?.key === 2) {
            console.log("doing stage 4", { data, prevState });
            const psi_output = state4_bindgen(
              prevState.current.value.public_output_a,
              parsedMessage
            );

            setPsi([...psi_output].slice(0, 10));
          } else {
            console.error(
              "unrecognized or invalid state:",
              data.state,
              prevState
            );
          }
        }
      });
      setConnected(true);
      await sendConnectionChunked(
        target,
        {
          state: 0,
          message: state0.message_a_to_b
        },
        8 * 1024
      );
      // prevState.current = ({ key: 0, value: state0 });

      setLoading(false);
    }
  }

  console.log({ prevState });

  // if (!id) {
  //   return <ScreenLoader />;
  // }

  const targetUrl = `${window.location.origin}/#/zoo?target=${id}`;
  if (isLoading) {
    return <ScreenLoader />;
  }

  return (
    <AppContainer bg="gray">
      <H1>ZOO PASS</H1>
      {!id &&
        (target ? (
          <TextCenter style={{ marginTop: 24 }}>
            Someone wants to know what's in your ZOO
          </TextCenter>
        ) : (
          <TextCenter style={{ marginTop: 24 }}>What's in your ZOO?</TextCenter>
        ))}
      {!id && (
        <div style={{ marginTop: 24 }}>
          {animals.map((animal, index) => (
            <div key={animal.name}>
              <label style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={bits[index] === 1}
                  disabled={!!id}
                  onChange={() => handleBitsChange(index)}
                  style={{ marginRight: "8px" }}
                />
                <span>
                  {animal.name}&nbsp;&nbsp;{animal.emoji}
                </span>
              </label>
            </div>
          ))}
        </div>
      )}
      <Spacer h={24} />
      <Spacer h={24} />
      {!id && <Button onClick={startSession}>HBU?</Button>}

      {id &&
        (connected ? (
          psi ? (
            <div>
              <TextCenter>Animals in common:</TextCenter>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "10px"
                }}
              >
                {psi.map(
                  (value, index) =>
                    value === 1 && (
                      <span key={index} style={{ fontSize: "24px" }}>
                        {animals[index].emoji}
                      </span>
                    )
                )}
              </div>
              {psi.every((value) => value === 0) && (
                <TextCenter style={{ marginTop: "10px" }}>
                  No animals in common 😢
                </TextCenter>
              )}
            </div>
          ) : (
            <RippleLoader />
          )
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: "white"
              }}
            >
              <a
                style={{ color: "white", textDecoration: "underline" }}
                href={targetUrl}
              >
                Connection URL
              </a>{" "}
              <CircleButton
                diameter={20}
                padding={16}
                onClick={async () => {
                  await navigator.clipboard.writeText(targetUrl);
                  toast("Copied URL", {
                    icon: "👍"
                  });
                }}
              >
                <FaRegCopy color="white" />
              </CircleButton>
            </div>
            <Spacer h={32} />
            <div style={{ width: "75%", background: "white" }}>
              <QRDisplayWithRegenerateAndStorage
                key={targetUrl}
                maxAgeMs={1000 * 60}
                generateQRPayload={async (): Promise<string> => targetUrl}
              />
            </div>
          </>
        ))}
    </AppContainer>
  );
}
