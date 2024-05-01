// Type declarations for iden3/fastfile, which is a JavaScript library
// with no published types.
// This is a minimum module declaration required to make our use case work.
// It doesn't claim to be a complete, or even necessarily accurate
// representation of the fastfile module, which is JavaScript without types.
declare module "fastfile" {
  export interface FastFile {
    public totalSize: number | bigint;
    public async read(length: number | bigint): Uint8Array;
    public async close(): void;
  }

  export async function readExisting(path: string): FastFile;
}
