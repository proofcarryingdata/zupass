import {
  Biome,
  EdDSAFrogPCD,
  EdDSAFrogPCDPackage,
  Rarity,
  Temperament,
  getEdDSAFrogData
} from "@pcd/eddsa-frog-pcd";
import {
  ImageZoom,
  LinkButton,
  encodeQRPayload,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";

export const EdDSAFrogPCDUI: PCDUI<EdDSAFrogPCD, unknown> = {
  renderCardBody: EdDSAFrogCardBody,
  getHeader: Header
};

function Header({ pcd }: { pcd: EdDSAFrogPCD }) {
  const frogData = useMemo(() => getEdDSAFrogData(pcd), [pcd]);
  if (!frogData) {
    return <>Frog</>;
  }

  if (frogData.rarity === Rarity.Mythic) {
    return (
      <MythicContainer>
        {`#${frogData.frogId} ${frogData.name}`}
      </MythicContainer>
    );
  }

  const rarityColors = {
    [Rarity.Common]: "#2D9061",
    [Rarity.Rare]: "#1197B5",
    [Rarity.Epic]: "#6F3BB0",
    [Rarity.Legendary]: "#FF9900",
    [Rarity.Unknown]: "#A7967E",
    [Rarity.Object]: "#A7967E"
  } as const;

  return (
    <HeaderContainer
      style={{
        backgroundColor:
          rarityColors[frogData.rarity] ?? "var(--bg-dark-primary)"
      }}
    >
      {`#${frogData.frogId} ${frogData.name}`}
    </HeaderContainer>
  );
}

function EdDSAFrogCardBody({ pcd }: { pcd: EdDSAFrogPCD }) {
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
      <LinkButton
        style={{ textAlign: "center" }}
        onClick={() => setShowPCD(true)}
      >
        View as proof&#x2011;carrying data
      </LinkButton>
      <ImageZoom
        src={frogData?.imageUrl}
        draggable={false}
        loading="lazy"
        style={{ width: "100%", height: "auto", zIndex: "1000" }}
        options={{
          background: "rgba(0, 0, 0, 0.5)"
        }}
      />
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
      <LinkButton onClick={() => setShowMore(!showMore)}>
        {showMore ? "Collapse" : "See more"}
      </LinkButton>
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
  const [hex, setHex] = useState("");
  const generate = useCallback(async () => {
    const serialized = await EdDSAFrogPCDPackage.serialize(pcd);
    return encodeQRPayload(JSON.stringify(serialized));
  }, [pcd]);
  useEffect(() => {
    generate().then(setHex);
  }, [generate]);

  return <HexContainer>{hex}</HexContainer>;
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
  gap: 20px;
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

const HexContainer = styled.div`
  word-wrap: break-word;
  word-break: break-all;
  white-space: normal;
  overflow-wrap: anywhere;
  max-height: 300px;
  overflow-y: auto;
`;

const HeaderContainer = styled.div`
  text-align: center;
  margin: -10px;
  padding: 10px;
  color: white;
  font-weight: bold;
`;

const MythicContainer = styled(HeaderContainer)`
  @keyframes SAHGlowingGradient {
    0% {
      background-position: 84% 0;
    }
    50% {
      background-position: 17% 100%;
    }
    100% {
      background-position: 84% 0;
    }
  }

  appearance: none;
  background: linear-gradient(
    48deg,
    #e3c1f4,
    #d9d7ed,
    #dff7f1,
    #acf0ff,
    #e3c1f4,
    #d9d7ed,
    #dff7f1,
    #acf0ff,
    #e3c1f4
  );
  animation: SAHGlowingGradient 8s ease infinite;
  opacity: 1;
  background-size: 400% 400%;

  color: #fda7a7;
  text-shadow: 0px 1px 2px #129191;
`;
