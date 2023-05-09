// TODO: actually check types?
export type HexString = string;
export type Utf8String = string;
export type Base64String = string;

export interface EncryptedPacket {
  nonce: HexString;
  ciphertext: Base64String;
}
