import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Input,
  Spacer,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import {
  PipelineCheckinSummary,
  requestGenericIssuanceGetManualCheckIns
} from "@pcd/passport-interface";
import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import * as React from "react";
import { ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import { CheckInModal } from "./CheckInModal";

function safeFilterValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

const CheckInTable = React.memo(function ({
  checkIns,
  startCheckIn
}: {
  checkIns: PipelineCheckinSummary[];
  startCheckIn: (ticketId: string) => void;
}): ReactNode {
  const columns: ColumnDef<PipelineCheckinSummary>[] = [
    {
      header: "Email",
      accessorKey: "email",
      filterFn: (row, _columnId, value): boolean => {
        if (value === "") {
          return true;
        }
        return row.original.email.startsWith(value);
      }
    },
    {
      header: "Checked in?",
      accessorKey: "checkedIn",
      cell: (props): JSX.Element => {
        if (props.row.original.checkedIn) {
          return (
            <Button
              disabled={true}
              colorScheme="orange"
              style={{ pointerEvents: "none" }}
              size="sm"
            >
              Checked In
            </Button>
          );
        } else {
          return (
            <Button
              colorScheme="green"
              onClick={() => startCheckIn(props.row.original.ticketId)}
              size="sm"
            >
              Check in
            </Button>
          );
        }
      },
      enableColumnFilter: false
    },
    {
      header: "Ticket type",
      accessorKey: "ticketName",
      enableColumnFilter: false
    },
    {
      header: "Check-in date",
      accessorKey: "timestamp",
      cell: (props): string => {
        const timestamp = Date.parse(props.row.original.timestamp ?? "");
        if (isNaN(timestamp)) {
          return "";
        }
        const options: Intl.DateTimeFormatOptions = {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          hour12: false,
          timeZone: "America/Los_Angeles"
        };
        return new Intl.DateTimeFormat("en-US", options).format(
          new Date(timestamp)
        );
      },
      enableColumnFilter: false
    },
    {
      header: "Checked in by",
      accessorKey: "checkerEmail",
      enableColumnFilter: false
    }
  ];

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "email",
      desc: false
    }
  ]);

  const table = useReactTable({
    data: checkIns,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), //client side filtering
    state: {
      sorting,
      columnFilters
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters
  });

  return (
    <>
      <Spacer h={8} />
      <label htmlFor="email-filter">
        Search for email:
        <Input
          id="email-filter"
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
            table.getColumn("email")?.setFilterValue(ev.target.value)
          }
          value={safeFilterValue(table.getColumn("email")?.getFilterValue())}
        />
      </label>
      <Spacer h={8} />
      <Table variant="striped">
        <Thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <Tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Th key={header.id}>
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </span>
                </Th>
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody>
          {table.getRowModel().rows.map((row) => (
            <Tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
});

async function getCheckIns(): Promise<PipelineCheckinSummary[]> {
  const result = await requestGenericIssuanceGetManualCheckIns(
    process.env.PASSPORT_SERVER_URL as string,
    process.env.MANUAL_CHECKIN_PIPELINE_ID as string,
    process.env.MANUAL_CHECKIN_API_KEY as string
  );

  if (result.success) {
    return result.value.checkIns;
  } else {
    throw new Error("Could not fetch check-in data");
  }
}

export function CheckinListPage(): ReactNode {
  const query = useQuery({ queryKey: ["checkIns"], queryFn: getCheckIns });

  const [checkingIn, setCheckingIn] = useState<string | undefined>(undefined);

  const startCheckIn = useCallback(
    (ticketId: string) => setCheckingIn(ticketId),
    []
  );

  return (
    <main>
      <Content>
        <H1>Zupass Check-in</H1>

        {query.isFetching && !query.isRefetching && (
          <>
            <Spacer h={8} />
            <Spinner />
          </>
        )}
        {query.isError && (
          <>
            <Spacer h={8} />
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Error fetching check-in data.</AlertTitle>
              <AlertDescription>
                Could not fetch check-in data. Please{" "}
                <span
                  onClick={() => query.refetch()}
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                >
                  click here
                </span>{" "}
                to try again.
              </AlertDescription>
            </Alert>
          </>
        )}

        {query.isSuccess && (
          <>
            <CheckInModal
              checkingIn={checkingIn}
              setCheckingIn={setCheckingIn}
              data={query.data}
            />
            <CheckInTable startCheckIn={startCheckIn} checkIns={query.data} />
          </>
        )}
      </Content>
    </main>
  );
}

const Content = styled.div`
  padding: 32px;
  width: 100%;
  height: 100%;
`;

const H1 = styled.h1`
  font-size: 28px;
  font-weight: 700;
`;
