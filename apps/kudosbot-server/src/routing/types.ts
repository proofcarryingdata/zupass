import express from "express";
import { ApplicationContext } from "../types";

export interface RouteInitializer {
  (app: express.Application, context: ApplicationContext): void;
}
