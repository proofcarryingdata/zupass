import { Buffer } from "buffer";
import { gzip, ungzip } from "pako";

export function encodeQRPayload(unencoded: string): string {
  console.log(`encoding payload with length ${unencoded.length}`);
  const compressedData = gzip(unencoded);
  const base64CompressedData = Buffer.from(compressedData).toString("base64");
  console.log(
    `Compressed: ${compressedData.length}, base64: ${base64CompressedData.length}`
  );

  return base64CompressedData;
}

export function decodeQRPayload(encoded: string): string {
  const buffer = Buffer.from(encoded, "base64");
  const unzippedBuffer = Buffer.from(ungzip(buffer));
  const decodedBuffer = unzippedBuffer.toString("utf8");
  return decodedBuffer;
}

export function makeEncodedVerifyLink(encodedPCD: string): string {
  const link = `${window.location.origin}#/verify?pcd=${encodeURIComponent(
    encodedPCD
  )}`;
  return link;
}
