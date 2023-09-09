import QRCode from "react-qr-code";
import { useEffect, useRef, useState } from "react";

function splitStringIntoChunks(str: string, chunkSize: number) {
  const chunks = [];
  let index = 0;
  // console.log(str.length)
  while (index < str.length) {
    chunks.push(str.slice(index, index + chunkSize));
    index += chunkSize;
  }
  return chunks;
}

const chunkSize = 1750; // The max length for each chunk

export default function GifQR({ proof }: { proof: string }) {
  const tick = useRef<NodeJS.Timeout | number | null>(null);

  const [currentQRCode, setCurrentQRCode] = useState(0);
  const arrayOfChunks = splitStringIntoChunks(proof, chunkSize);

  useEffect(() => {
    tick.current = setInterval(() => {
      // console.log('tick')

      console.log("currentQRCode", currentQRCode);
      console.log("arrayOfChunks.length", arrayOfChunks.length);
      if (currentQRCode === arrayOfChunks.length - 1) {
        setCurrentQRCode(0);
      } else {
        setCurrentQRCode(currentQRCode + 1);
      }
    }, 700);
    return () => clearInterval(tick.current as any);
  }, [arrayOfChunks.length, currentQRCode]);

  // console.log(proof)
  // console.log(arrayOfChunks.length)
  // console.log(arrayOfChunks[0])

  const QRCodes = arrayOfChunks.map((chunk, i) => {
    let id;
    if (i < 10) {
      id = `0${i}`;
    } else {
      id = i;
    }

    let numChunks;

    if (arrayOfChunks.length < 10) {
      numChunks = `0${arrayOfChunks.length.toString()}`;
    } else {
      numChunks = arrayOfChunks.length.toString();
    }

    return (
      <QRCode
        key={i}
        level="L"
        size={256}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        value={id + numChunks + chunk}
        viewBox={`0 0 256 256`}
      />
    );
  });

  return <main className="p-8 w-7/12 m-auto">{QRCodes[currentQRCode]}</main>;
  // return <main className='p-8 w-7/12 m-auto'>{QRCodes[8]}</main>
}
