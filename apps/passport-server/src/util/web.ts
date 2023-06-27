import { WebServiceResponse } from "../services/types";

export function tryRespond(
  respond: () => WebServiceResponse,
  res: Express.Response
) {}
