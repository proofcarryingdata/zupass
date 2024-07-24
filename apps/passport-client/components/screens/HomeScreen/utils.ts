export interface EventInfo {
  start: string;
  end: string;
  image?: string;
}

export const EVENTS: Record<string, EventInfo> = {
  "ETH Berlin 04": { start: "2023-04-01", end: "2023-04-03" },
  "0xPARC Summer '24": { start: "2023-05-15", end: "2023-05-18" },
  "Edge Esmeralda": {
    start: "2023-06-10",
    end: "2023-06-12",
    image:
      "https://cdn.prod.website-files.com/65e8d8e39d148666896efd73/65e8d9c0db3e30b4fd35b335_kuri%201-c.png"
  },
  "ETH Prague 2024": { start: "2023-07-22", end: "2023-07-25" },
  "ETH LATAM SPS": { start: "2023-08-05", end: "2023-08-07" },
  "ETH Berlin 09": { start: "2023-09-18", end: "2023-09-21" },
  "Edge City": {
    start: "2023-10-18",
    end: "2023-10-21",
    image:
      "https://cdn.prod.website-files.com/65b2cb5abdecf7cd7747e170/65c139390d09b586db66b032_bg-image_v01.png"
  }
};

export function isEvent(folder: string): folder is keyof typeof EVENTS {
  return EVENTS[folder] !== undefined;
}
