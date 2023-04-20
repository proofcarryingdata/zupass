import QRCode from "qrcode";
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
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvas) return;

    const ctx: any = canvas.getContext("2d");
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    QRCode.toCanvas(canvas, value, {
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel: "L",
    });
  }, [bgColor, canvas, fgColor, value]);

  return <Canvas ref={setCanvas}></Canvas>;
}

const Canvas = styled.canvas`
  width: 100% !important;
  height: 100% !important;
`;
