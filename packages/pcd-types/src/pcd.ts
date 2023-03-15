export interface PCD<C = unknown, P = unknown> {
  type: string;
  claim: C;
  proof: P;
}

export interface SerializedPCD {
  type: string;
  pcd: string;
}

export interface PCDPackage<C = unknown, P = unknown, A = unknown> {
  name: string;
  prove(args: A): Promise<PCD<C, P>>;
  verify(pcd: PCD<C, P>): Promise<boolean>;
  serialize(pcd: PCD<C, P>): Promise<SerializedPCD>;
  deserialize(seralized: string): Promise<PCD<C, P>>;
}
