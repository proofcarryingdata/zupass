import express from "express";

import { ITicketData } from "@pcd/eddsa-ticket-pcd";
import { ApplicationContext } from "../types";

export interface RouteInitializer {
  (app: express.Application, context: ApplicationContext): void;
}

export interface SessionData {
  watermark?: string;
  ticket?: Partial<ITicketData>;
}
