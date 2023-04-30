import { DateRange } from "@pcd/passport-interface";
import { ClientBase, Pool } from "pg";

export async function updateParticipant(
  client: ClientBase | Pool,
  params: { email: string; role: string; visitor_date_ranges?: DateRange[] }
): Promise<number> {
  const result = await client.query(
    `\
update pretix_participants
set role=$2, visitor_date_ranges=$3
where email=$1;`,
    [
      params.email,
      params.role,
      params.visitor_date_ranges === undefined
        ? undefined
        : JSON.stringify(params.visitor_date_ranges),
    ]
  );
  return result.rowCount;
}
