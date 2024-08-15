import { Spinner } from "@chakra-ui/react";
import { POD, podEntriesFromSimplifiedJSON } from "@pcd/pod";
import { PODPCD, PODPCDPackage, PODPCDTypeName } from "@pcd/pod-pcd";
import { PODPCDUI } from "@pcd/pod-pcd-ui";
import { ReactNode, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { v5 } from "uuid";
import { useEmbeddedZupass } from "../hooks/useEmbeddedZupass";
import { ZUPASS_URL } from "../main";

const PODPCDCard = PODPCDUI.renderCardBody;
const FOLDER = "puddle";

export function FrogCrypto(): ReactNode {
  const { z, connected } = useEmbeddedZupass();
  const [cooldown, setCooldown] = useState(0);
  const [nonce, setNonce] = useState(() => {
    const storedNonce = localStorage.getItem("frogNonce");
    return storedNonce ? parseInt(storedNonce, 10) : 0;
  });
  const [frogs, setFrogs] = useState<PODPCD[]>([]);
  const [loading, setLoading] = useState(true);

  const FROG_NAMESPACE = "ad33b013-2d12-4b8f-a41b-f63d69e5245c";
  const frogImages = [
    "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGx2NDY5a2MwdGJiajMyYW55c3N5aDllOGhreTI1MXl6bms4aWp5bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/iHelSt93ORqbFRnMYU/giphy.gif",
    // "https://media.tenor.com/5ke1tTchXGMAAAAi/soju-frog.gif",
    "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHlpaTJmOXJnbW5weDVtY3I5enQ3MWhmcDBpMDUyZG8xb2oxZzgxaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FaBd4anAA0cdiCLOJN/giphy.gif",
    "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExYmxyaDEzYTMxbXMxOXhncWo0MWZ3OHVvbHRsOGh4MjMyMGlzeDFxaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/lQRW4M0Zg8LTqNovWj/giphy.gif",
    "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2hmbnU4eGx4YnM3NzB3YzAzZ2lxMWQyMDJ5cmMxbTB5aXNhYTIyciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/y0PmMY7bfz41760kn8/giphy.gif"
  ];

  const zupassUrl = useMemo(() => {
    return localStorage.getItem("zupassUrl") || ZUPASS_URL;
  }, []);

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    localStorage.setItem("frogNonce", nonce.toString());
  }, [nonce]);

  useEffect(() => {
    const loadFrogs = async () => {
      if (connected) {
        console.log("loading");
        try {
          const loadedFrogs = await getCurrentPODPCDs(FOLDER);
          setFrogs(loadedFrogs);
        } catch (error) {
          console.error("Error loading frogs:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadFrogs();
  }, [connected]);

  if (!connected) {
    return (
      <Container>
        <Spinner size="xl" />
      </Container>
    );
  }

  const getCurrentPODPCDs = async (folder: string): Promise<PODPCD[]> => {
    const list = await z.fs.list(folder);
    const pcdIds = list
      .filter((l) => l.type === "pcd" && l.pcdType === PODPCDTypeName)
      .map((l: any) => l.id);
    return Promise.all(
      pcdIds.map((id) =>
        z.fs
          .get(id)
          .then((s) => PODPCDPackage.deserialize(s.pcd) as unknown as PODPCD)
      )
    );
  };

  const formatCooldown = (seconds: number) => {
    const remainingSeconds = seconds % 60;
    return `${remainingSeconds.toString()}s`;
  };

  return (
    <div>
      {!!frogs.length && (
        <p className="mb-2 text-lg text-center">{frogs.length} 🐸</p>
      )}
      <button
        onClick={async () => {
          const imageUrl = frogImages[nonce % frogImages.length];
          const pod = await POD.sign(
            podEntriesFromSimplifiedJSON(
              JSON.stringify({
                zupass_display: "collectable",
                zupass_image_url: imageUrl,
                zupass_title: `FROG ${nonce}`,
                zupass_description: "here's a frog",
                owner: (await z.identity.getIdentityCommitment()).toString()
              })
            ),
            "0001020304050607080900010203040506070809000102030405060708090000"
          );
          const newPOD = new PODPCD(
            v5(`${pod.contentID}`, FROG_NAMESPACE),
            pod
          );
          await z.fs.put(FOLDER, await PODPCDPackage.serialize(newPOD));
          setFrogs(await getCurrentPODPCDs(FOLDER));
          setCooldown(10);
          // alert(`got frog ${nonce}`);
          setNonce((prevNonce) => {
            const newNonce = prevNonce + 1;
            localStorage.setItem("frogNonce", newNonce.toString());
            return newNonce;
          });
        }}
        disabled={cooldown > 0}
        className="bg-green-700 text-white px-4 py-2 rounded disabled:bg-gray-400 mb-4"
      >
        {cooldown > 0
          ? `Get FROG (wait ${formatCooldown(cooldown)})`
          : "Get FROG"}
      </button>

      <h1 className="text-xl font-bold mb-2">FROGS</h1>
      {!frogs.length && <p>None yet - go collect some!</p>}
      <Container>
        {loading ? (
          <Spinner />
        ) : (
          frogs.map((pod) => (
            <CardBodyContainer key={pod.id}>
              <strong>{pod.claim.entries.zupass_title.value}</strong>
              <PODPCDCard pcd={pod as PODPCD} />
            </CardBodyContainer>
          ))
        )}
      </Container>
    </div>
  );
}
const Container = styled.div`
  gap: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const CardBodyContainer = styled.div`
  background-color: white;
  color: var(--bg-dark-primary);

  max-width: 420px;
  border-radius: 12px;
  border: 1px solid grey;
  background: var(--primary-dark);
  padding: 10px;
`;

// export const CardOutlineExpanded = styled.div`
//   ${({ disabled }: { disabled?: boolean }) => css`
//     width: 100%;
//     border-radius: 12px;
//     border: 1px solid var(--accent-dark);
//     background: var(--primary-dark);
//     overflow: hidden;

//     ${disabled &&
//     css`
//       opacity: 0.7;
//     `}
//   `}
// `;
