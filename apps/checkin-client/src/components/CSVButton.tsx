import { Button } from "@chakra-ui/react";
import { PipelineCheckinSummary } from "@pcd/passport-interface";
import { stringify } from "csv-stringify/sync";
import { ReactNode, useCallback } from "react";

export function CSVButton({
  checkIns
}: {
  checkIns: PipelineCheckinSummary[];
}): ReactNode {
  const generateCSV = useCallback(() => {
    const data = checkIns.map((checkIn) => {
      return {
        "E-mail": checkIn.email,
        "Checked in": checkIn.checkedIn ? "Yes" : "No",
        "Ticket type": checkIn.ticketName,
        "Check-in date": checkIn.timestamp
      };
    });

    const csv =
      "data:text/csv," +
      encodeURIComponent(
        stringify(data, {
          header: true,
          record_delimiter: "\r\n"
        })
      );
    const link = document.createElement("a");
    link.download = "check-ins.csv";
    link.href = csv;
    link.click();
  }, [checkIns]);

  return <Button onClick={generateCSV}>Export CSV</Button>;
}
