import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import {
  ChangeEvent,
  ReactNode,
  useCallback,
  useEffect,
  useState
} from "react";
import styled from "styled-components";

function CheckInTable({
  checkIns,
  startCheckIn
}: {
  checkIns: PipelineCheckinSummary[];
  startCheckIn: (ticketId: string) => void;
}): ReactNode {
  const columns: ColumnDef<PipelineCheckinSummary>[] = [
    {
      header: "Email",
      accessorKey: "email"
    },
    {
      header: "Checked in?",
      accessorKey: "checkedIn",
      cell: (props): JSX.Element => {
        if (props.row.original.checkedIn) {
          return <>✅</>;
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
      }
    },
    {
      header: "Ticket type",
      accessorKey: "ticketName"
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
      }
    },
    {
      header: "Checked in by",
      accessorKey: "checkerEmail"
    }
  ];

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
    state: {
      sorting
    },
    onSortingChange: setSorting
  });

  return (
    <>
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
}

export function CheckinListPage(): ReactNode {
  const [checkIns, setCheckIns] = useState<
    PipelineCheckinSummary[] | undefined
  >(undefined);

  useEffect(() => {
    requestGenericIssuanceGetManualCheckIns(
      process.env.PASSPORT_SERVER_URL,
      process.env.MANUAL_CHECKIN_PIPELINE_ID,
      process.env.MANUAL_CHECKIN_API_KEY
    ).then((result) => {
      if (result.success) {
        setCheckIns(result.value.checkIns);
      }
    });
  }, []);

  const [checkingIn, setCheckingIn] = useState<string | undefined>(undefined);
  const onClose = useCallback(() => setCheckingIn(undefined), []);

  const startCheckIn = useCallback(
    (ticketId: string) => setCheckingIn(ticketId),
    []
  );

  const [search, setSearch] = useState<string>("");

  const handleSearch = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value),
    []
  );

  return (
    <main>
      <Content>
        <H1>Zupass Check-in</H1>
        <Modal
          onClose={onClose}
          isOpen={!!checkingIn}
          isCentered
          motionPreset="slideInBottom"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Modal Title</ModalHeader>
            <ModalCloseButton />
            <ModalBody>hi</ModalBody>
            <ModalFooter>
              <Button onClick={onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        <label htmlFor="search">
          Search for email:
          <Input
            id="search"
            type="text"
            placeholder="e.g. test@example.com"
            onChange={handleSearch}
            value={search}
          />
        </label>
        {checkIns && (
          <CheckInTable startCheckIn={startCheckIn} checkIns={checkIns} />
        )}
      </Content>
    </main>
  );
}

/*

   <Table colorScheme="whiteAlpha" variant="simple">
          <Thead>
            <Tr>
              <Th>Email</Th>
              <Th>Checked in?</Th>
              <Th>Ticket type</Th>
              <Th>Check-in date</Th>
              <Th>Checked in by</Th>
            </Tr>
          </Thead>
          <Tbody>
            {checkIns?.map((checkIn) => {
              return (
                <Tr key={checkIn.ticketId}>
                  <Td>{checkIn.email}</Td>
                  <Td>{checkIn.checkedIn ? "✅" : "❌"}</Td>
                  <Td>{checkIn.ticketName}</Td>
                  <Td>{checkIn.timestamp}</Td>
                  <Td>{checkIn.checkerEmail}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>

        */

const Content = styled.div`
  padding: 32px;
  width: 100%;
  height: 100%;
`;

const H1 = styled.h1`
  font-size: 28px;
  font-weight: 700;
`;
