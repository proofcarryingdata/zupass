import {
  LinkButton,
  QRDisplayWithRegenerateAndStorage,
  encodeQRPayload
} from "@pcd/passport-ui";
import _ from "lodash";
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Biome,
  EdDSAFrogPCD,
  EdDSAFrogPCDPackage,
  Temperament,
  initArgs
} from "./EdDSAFrogPCD";
import { getEdDSAFrogData } from "./utils";

export function EdDSAFrogCardBody({ pcd }: { pcd: EdDSAFrogPCD }) {
  const frogData = useMemo(() => getEdDSAFrogData(pcd), [pcd]);
  const [showMore, setShowMore] = useState(false);
  const [showPCD, setShowPCD] = useState(false);

  if (!frogData) {
    return (
      <Container>
        <FrogQR pcd={pcd} />
      </Container>
    );
  }

  return showPCD ? (
    <Container>
      <LinkButton onClick={() => setShowPCD(false)}>View as frog</LinkButton>
      <FrogQR pcd={pcd} />
      <CopyFrogPCD pcd={pcd} />
    </Container>
  ) : (
    <Container>
      <LinkButton onClick={() => setShowPCD(true)}>
        View as proof-carrying data
      </LinkButton>
      <FrogImg src={frogData?.imageUrl} draggable={false} />
      <FrogInfo>
        <FrogAttribute label="JMP" title="Jump" value={frogData.jump} />
        <FrogAttribute
          label="VIB"
          title="Vibe"
          value={temperamentValue(frogData.temperament)}
        />
        <FrogAttribute label="SPD" title="Speed" value={frogData?.speed} />
        <FrogAttribute
          label="INT"
          title="Intelligence"
          value={frogData.intelligence}
        />
        <FrogAttribute label="BTY" title="Beauty" value={frogData.beauty} />
      </FrogInfo>
      {showMore && (
        <>
          <Description>{frogData.description}</Description>
          <FrogInfo>
            <FrogAttribute
              label="Signed at"
              title={`Signed at: ${frogData.timestampSigned}`}
              value={new Date(frogData.timestampSigned).toLocaleDateString()}
            />
            <FrogAttribute
              label="Source"
              title="Biome"
              value={biomeValue(frogData.biome)}
            />
          </FrogInfo>
        </>
      )}
      <LinkButton onClick={() => setShowMore(!showMore)}>
        {showMore ? "Collapse" : "See more"}
      </LinkButton>
    </Container>
  );
}

function FrogAttribute({
  label,
  title,
  value
}: {
  label: string;
  title: string;
  value: string | number | undefined;
}) {
  return (
    <Attribute>
      <AttrTitle title={title}>{label}</AttrTitle>
      <AttrValue style={{ color: attrColor(value) }}>
        {formatAttrValue(value)}
      </AttrValue>
    </Attribute>
  );
}

function attrColor(value: string | number | undefined) {
  if (typeof value === "number") {
    if (value <= 3) {
      return "#a95940";
    }
    if (value >= 7) {
      return "#206b5e";
    }
  }
}

function formatAttrValue(value: string | number | undefined) {
  if (typeof value === "number") {
    return String(value).padStart(2, "0");
  }
  return value;
}

function temperamentValue(temperament: Temperament) {
  switch (temperament) {
    case Temperament.UNKNOWN:
      return "???";
    case Temperament.N_A:
      return "N/A";
    default:
      return Temperament[temperament];
  }
}

function biomeValue(biome: Biome) {
  return _.startCase(Biome[biome]);
}

function FrogQR({ pcd }: { pcd: EdDSAFrogPCD }) {
  const generate = useCallback(async () => {
    console.log(`[QR] generating proof, timestamp ${Date.now()}`);
    const serialized = await EdDSAFrogPCDPackage.serialize(pcd);
    const serializedPCD = JSON.stringify(serialized);
    console.log(`[QR] generated proof, length ${serializedPCD.length}`);
    const encodedPCD = encodeQRPayload(serializedPCD);
    if (!initArgs.makeEncodedVerifyLink) {
      throw new Error("must provide makeEncodedVerifyLink");
    }
    const verificationLink = initArgs.makeEncodedVerifyLink(encodedPCD);
    return verificationLink;
  }, [pcd]);

  return (
    <QRDisplayWithRegenerateAndStorage
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={pcd.id}
    />
  );
}

function CopyFrogPCD({ pcd }: { pcd: EdDSAFrogPCD }) {
  const [copied, setCopied] = useState(false);
  const onClick = useCallback(async () => {
    const serialized = await EdDSAFrogPCDPackage.serialize(pcd);
    navigator.clipboard.writeText(JSON.stringify(serialized));
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }, [pcd]);

  return (
    <LinkButton onClick={onClick}>
      {copied ? "Copied!" : "Copy frog PCD"}
    </LinkButton>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
`;

const FrogInfo = styled.div`
  display: flex;
  justify-content: space-around;
  gap: 8px;
`;

const FrogImg = styled.img`
  width: 100%;
  height: auto;
`;

const Description = styled.div`
  font-size: 14px;
  color: rgba(var(--black-rgb), 0.8);
`;

const Attribute = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-family: monospace;
`;

const AttrTitle = styled.div`
  font-weight: bold;
  font-size: 14px;
  text-transform: uppercase;
`;

const AttrValue = styled.div`
  font-size: 14px;
`;
