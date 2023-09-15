import QRCode from "react-qr-code";
import { useEffect, useRef, useState } from "react";
import JSONbig from "json-bigint";

const chunkSize = 300; // The max length for each chunk

export default function GifQR({ proof }: { proof: string }) {
  function decToBaseN(decStr: string, base: number): string | null {
    console.log(`Input decimal string: ${decStr}`);
    console.log(`Target base: ${base}`);

    // Count the leading zeros
    const leadingZeros = decStr.match(/^0+/);
    let zerosCount = 0;
    if (leadingZeros) {
      zerosCount = leadingZeros[0].length;
    }
    console.log(`Count of leading zeros in decimal: ${zerosCount}`);

    // Validate if it's a number
    if (!/^\d+$/.test(decStr)) {
      console.log(`Invalid input: ${decStr} is not a decimal number.`);
      return null;
    }

    try {
      // Convert the decimal part to BigInt and then to the target base
      const decimalPart = decStr.slice(zerosCount);
      console.log(`Decimal part after removing leading zeros: ${decimalPart}`);

      const decimal = BigInt(decimalPart);
      const converted = decimal.toString(base);

      console.log(`Converted part after conversion: ${converted}`);

      // Re-add the leading zeros directly
      const leadingConvertedZeros = "0".repeat(zerosCount);

      console.log(`Re-adding ${zerosCount} leading zeros for base ${base}`);

      const result = leadingConvertedZeros + converted;
      // console.log(`Result.length: ${result.length}`);
      return result;
    } catch (e) {
      console.error("Error converting to BigInt:", e);
      return null;
    }
  }

  function splitStringIntoChunks(str: string, chunkSize: number) {
    const chunks = [];
    let index = 0;
    // console.log(str.length)
    while (index < str.length) {
      chunks.push(str.slice(index, index + chunkSize));
      index += chunkSize;
    }
    console.log("chunks.length", chunks.length);
    return chunks;
  }
  // console.log("proof in GirQR", proof);
  const tick = useRef<NodeJS.Timeout | number | null>(null);

  const [currentQRCode, setCurrentQRCode] = useState(0);
  const [arrayOfChunks, setArrayOfChunks] = useState<string[]>([]);

  useEffect(() => {
    // const hexProof = decToHex(proof);
    const hexProof = decToBaseN(proof, 36);
    console.log("hexProof", hexProof?.length);

    if (!hexProof) {
      throw new Error("Invalid proof");
    }
    console.log("hexProof", hexProof);
    const arrayOfChunks = splitStringIntoChunks(hexProof, chunkSize);
    setArrayOfChunks(arrayOfChunks);
  }, [proof, setArrayOfChunks]);

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
    }, 150);
    return () => clearInterval(tick.current as any);
  }, [setCurrentQRCode, currentQRCode, arrayOfChunks]);

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
