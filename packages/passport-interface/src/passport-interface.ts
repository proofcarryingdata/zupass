import { PCD } from "pcd-types";

export interface PCDGetRequest {
  origin: string;
  type: string;
  parameters: any;
  // etc.
}

export interface PCDAddRequest {
  origin: string;
  pcd: PCD;
}
