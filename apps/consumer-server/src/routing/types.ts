import express from "express";
import "iron-session";

import { ITicketData } from "@pcd/eddsa-ticket-pcd";
import { ApplicationContext } from "../types";

export interface RouteInitializer {
  (app: express.Application, context: ApplicationContext): void;
}

declare module "iron-session" {
  interface IronSessionData {
    nonce?: string;
    ticket?: Partial<ITicketData>;
  }
}
