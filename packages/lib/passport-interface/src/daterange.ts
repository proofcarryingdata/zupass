export interface DateRange {
  date_from?: string | null;
  date_to?: string | null;
}

export interface FullDateRange {
  date_from: string;
  date_to: string;
}

// Format a date string into "MMM D, YYYY"
const formatFull = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

// Format a date string into "MMM D" (no year)
const formatShort = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
};

// Format a date range into a short, human-readable string
// 1) If both date_from and date_to are present and the same year, format as "Oct 10 - Nov 10, 2025"
// 2) If both date_from and date_to are present and different years, format as "Oct 10, 2024 - Nov 10, 2025"
// 3) If only date_from is present, format as "Oct 10, 2025"
// 4) If only date_to is present, format as "Nov 10, 2025"
// 5) If neither date_from nor date_to are present, return an empty string
export function prettyPrintDateRange(range: DateRange): string {
  const { date_from, date_to } = range;

  if (!date_from && !date_to) {
    return "";
  }

  if (date_from && date_to) {
    const fromDate = new Date(date_from);
    const toDate = new Date(date_to);

    if (fromDate.getUTCFullYear() === toDate.getUTCFullYear()) {
      return `${formatShort(date_from)} - ${formatShort(
        date_to
      )}, ${fromDate.getUTCFullYear()}`;
    } else {
      return `${formatFull(date_from)} - ${formatFull(date_to)}`;
    }
  }

  if (date_from && !date_to) {
    return formatFull(date_from);
  }

  if (!date_from && date_to) {
    return formatFull(date_to);
  }

  return "";
}
