import * as ed from 'noble-ed25519';

export function newEdDSAPrivateKey(): Uint8Array {
  return ed.utils.randomPrivateKey();
}