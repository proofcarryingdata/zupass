export interface PCD<C = unknown, P = unknown> {
  type: string;
  claim: C;
  proof: P;
}

export interface PCDPackage<C, P, A> {
  prove(args: A): Promise<PCD<C, P>>;
  verify(pcd: PCD<C, P>): Promise<boolean>;
}
