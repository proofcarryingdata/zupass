import qr from "qr-image";
import { useEffect, useState } from "react";
import styled from "styled-components";

export function QR({
  value,
  fgColor,
  bgColor,
}: {
  value: string;
  fgColor: string;
  bgColor: string;
}) {
  const [svgObject, setSvgObject] = useState<any | undefined>();

  useEffect(() => {
    const svgObject = qr.svgObject(value, "L");
    setSvgObject(svgObject);
  }, [bgColor, fgColor, value]);

  return (
    <Container>
      {svgObject && (
        <svg
          viewBox={`0 0 ${svgObject.size} ${svgObject.size}`}
          preserveAspectRatio="none"
        >
          <path
            width="100%"
            height="100%"
            d={svgObject.path}
            fill={fgColor}
          ></path>
        </svg>
      )}
    </Container>
  );
}

const Container = styled.div`
  width: 100% !important;
  height: 100% !important;

  svg {
    width: 100%;
    height: 100%;
  }
`;
