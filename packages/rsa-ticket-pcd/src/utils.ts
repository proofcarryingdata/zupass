import { ITicketData, RSATicketPCD } from "./RSATicketPCD";

export function getTicketData(pcd: RSATicketPCD): ITicketData {
  let ticketData: ITicketData = {};
  try {
    ticketData = JSON.parse(
      pcd?.proof?.rsaPCD?.claim?.message ?? "{}"
    ) as ITicketData;
  } catch (e) {
    console.log("[TICKET] failed to parse");
  }

  return ticketData;
}
