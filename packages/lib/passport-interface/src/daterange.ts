export interface MaybeDateRange {
  date_from?: string | null;
  date_to?: string | null;
}

export interface FullDateRange {
  date_from: string;
  date_to: string;
}

export function serializeDateRange(range: FullDateRange): string {
  // Produces something like "2023-01-01T09:00:00.000Z/2023-01-01T17:00:00.000Z"
  const { date_from, date_to } = range;
  if (date_to) {
    return `${date_from}/${date_to}`;
  }
  return date_from;
}

export function parseDateRange(serialized: string): FullDateRange {
  const [date_from, date_to] = serialized.split("/");
  return {
    date_from,
    date_to
  };
}
