import { parse } from "csv-parse";
import { parse as syncParse } from "csv-parse/sync";

export function parseCSV(csv: string): Promise<string[][]> {
  return new Promise<string[][]>((resolve, reject) => {
    const parser = parse();
    const records: string[][] = [];

    parser.on("readable", function () {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on("error", (err) => {
      reject(err);
    });

    parser.on("end", () => {
      resolve(records);
    });

    parser.write(csv);
    parser.end();
  });
}

export function syncParseCSV(csv: string): string[][] {
  return syncParse(csv);
}
