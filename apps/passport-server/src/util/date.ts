import { DateTime } from "luxon";

export interface TimestampParams {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function getPacificTimeStamp(params: TimestampParams): Date {
  const dt = DateTime.fromObject(params, {
    zone: "America/Los_Angeles"
  });

  return dt.toJSDate();
}
