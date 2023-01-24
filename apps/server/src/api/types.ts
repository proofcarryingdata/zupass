import express from "express";
import { Client } from "pg";

export interface APIRoutes {
  (app: express.Application, client: Client): void;
}
