import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Heading,
  Link,
  ListItem,
  Stack,
  Table,
  TableContainer,
  Tag,
  TagLabel,
  Td,
  Th,
  Thead,
  Tr,
  UnorderedList
} from "@chakra-ui/react";
import {
  GenericIssuancePipelineListEntry,
  PipelineType,
  getError
} from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import {
  ColumnDef,
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { PageContent } from "../components/Core";
import { Header } from "../components/Header";
import {
  pipelineCreatedAt,
  pipelineIconFromStr,
  pipelineLastEdit,
  pipelineLink
} from "../components/PipelineDetails";
import { GIContext } from "../helpers/Context";
import { useFetchAllPipelines } from "../helpers/useFetchAllPipelines";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";
import {
  getAllHoneycombLinkForAllGenericIssuance,
  getAllHoneycombLinkForAllGenericIssuanceHttp,
  getAllHoneycombLinkForPipeline,
  getHoneycombQueryDurationStr,
  getLoadTraceHoneycombLinkForPipeline,
  timeAgo
} from "../helpers/util";

export default function Dashboard(): ReactNode {
  const stytchClient = useStytch();
  const userJWT = useJWT();
  const ctx = useContext(GIContext);
  const pipelinesFromServer = useFetchAllPipelines();
  const user = useFetchSelf();

  const isAdminView = ctx.isAdminMode && user?.value?.isAdmin;

  const pipelineEntries: GenericIssuancePipelineListEntry[] = useMemo(() => {
    if (!user?.value?.id) {
      return [];
    }

    const entries = pipelinesFromServer?.value ?? [];

    if (!isAdminView) {
      return entries.filter((e) => e.pipeline.ownerUserId === user.value.id);
    }

    return entries;
  }, [isAdminView, pipelinesFromServer?.value, user?.value?.id]);

  useEffect(() => {
    if (!userJWT) {
      window.location.href = "/";
    }
  }, [userJWT]);

  const maybeRequestError: string | undefined = getError(
    pipelinesFromServer,
    user
  );

  type Row = {
    status: "error" | "loaded" | "starting" | "paused";
    type: PipelineType;
    owner: string;
    timeCreated: string;
    timeUpdated: string;
    id: string;
    loadTraceLink: string;
    allTraceLink: string;
    lastLoad?: number;
    name?: string;
  };

  const entryToRow = useCallback(
    (entry: GenericIssuancePipelineListEntry): Row => {
      return {
        status: entry.pipeline.options?.paused
          ? "paused"
          : !entry.extraInfo.lastLoad
          ? "starting"
          : entry.extraInfo.lastLoad?.success
          ? "loaded"
          : "error",
        type: entry.pipeline.type,
        owner: entry.extraInfo.ownerEmail,
        timeCreated: entry.pipeline.timeCreated,
        timeUpdated: entry.pipeline.timeUpdated,
        id: entry.pipeline.id,
        loadTraceLink: getLoadTraceHoneycombLinkForPipeline(entry.pipeline.id),
        allTraceLink: getAllHoneycombLinkForPipeline(entry.pipeline.id),
        lastLoad: entry.extraInfo.lastLoad?.lastRunEndTimestamp,
        name: entry.pipeline.options?.name
      };
    },
    []
  );

  const rows: Row[] = useMemo(() => {
    return pipelineEntries.map(entryToRow);
  }, [entryToRow, pipelineEntries]);
  const columnHelper = createColumnHelper<Row>();
  const columns: Array<ColumnDef<Row> | undefined> = useMemo(
    () => [
      columnHelper.display({
        header: "",
        id: "edit",
        cell: (table) => {
          return <span>{pipelineLink(table.row.original.id)}</span>;
        }
      }),
      columnHelper.display({
        header: "name",
        id: "title_",
        cell: (table) => {
          return (
            <span>
              {table.row.original.name ? (
                table.row.original.name
              ) : (
                <span style={{ opacity: 0.6 }}>{"<untitled>"}</span>
              )}
            </span>
          );
        }
      }),
      columnHelper.accessor("timeUpdated", {
        header: "edited",
        cell: (props) => {
          const value = props.getValue().valueOf();
          return <span>{pipelineLastEdit(value)}</span>;
        }
      }),
      columnHelper.accessor("timeCreated", {
        header: "created",
        cell: (props) => {
          const value = props.getValue().valueOf();
          return <span>{pipelineCreatedAt(value)}</span>;
        }
      }),
      columnHelper.accessor("lastLoad", {
        header: "Last Load",
        cell: (props) => {
          const value = props.getValue()?.valueOf();
          return (
            <span>
              {value ? timeAgo.format(new Date(value), "mini") : "n/a"}
            </span>
          );
        }
      }),
      isAdminView
        ? columnHelper.accessor("owner", {
            header: "owner",
            cell: (props) => {
              const value = props.getValue().valueOf();
              return <span>{value}</span>;
            }
          })
        : undefined,

      columnHelper.accessor("type", {
        header: "type",
        cell: (props) => {
          const value = props.row.original.type;
          const icon =
            value === PipelineType.CSV
              ? "🗒️"
              : value === PipelineType.Lemonade
              ? "🍋"
              : "🎟️";
          return (
            <Tag>
              {icon}
              &nbsp;
              <TagLabel>{value}</TagLabel>
            </Tag>
          );
        }
      }),
      columnHelper.accessor("status", {
        enableSorting: false,
        header: "Status",
        cell: (props) => {
          const value = props.getValue().valueOf() as
            | "paused"
            | "starting"
            | "loaded"
            | "error";
          return (
            <Tag>
              {pipelineIconFromStr(value)}&nbsp;
              <TagLabel>{value}</TagLabel>
            </Tag>
          );
        }
      }),
      isAdminView
        ? columnHelper.display({
            header: "traces",
            cell: (table) => {
              const value = "";
              return (
                <span>
                  <Link
                    href={table.row.original.loadTraceLink}
                    isExternal={true}
                  >
                    load
                    <ExternalLinkIcon mx="2px" />
                  </Link>
                  &nbsp;
                  <Link href={value} isExternal={true}>
                    all
                    <ExternalLinkIcon mx="2px" />
                  </Link>
                </span>
              );
            }
          })
        : undefined
    ],
    [columnHelper, isAdminView]
  );
  const filteredColumns = useMemo(() => {
    return columns.filter((r) => !!r) as Array<ColumnDef<Row>>;
  }, [columns]);
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "timeUpdated",
      desc: true
    }
  ]);

  useEffect(() => {
    console.log("sorting", sorting);
  }, [sorting]);

  const table = useReactTable({
    columns: filteredColumns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting
    },
    onSortingChange: setSorting
  });

  if (maybeRequestError) {
    return (
      <>
        <Header user={user} stytchClient={stytchClient} />
        <PageContent>
          <h2>Error Loading Page</h2>
          {maybeRequestError}
        </PageContent>
      </>
    );
  }

  if (!user || !pipelinesFromServer) {
    return (
      <>
        <Header user={user} stytchClient={stytchClient} />
        <PageContent>Loading...</PageContent>
      </>
    );
  }

  return (
    <>
      <Header user={user} stytchClient={stytchClient} />
      <PageContent>
        {!pipelineEntries?.length ? (
          <p>No pipelines right now - go create some!</p>
        ) : (
          <>
            <Stack
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              padding={4}
              gap={4}
            >
              <Heading size="md" marginBottom={4}>
                Pipelines
              </Heading>
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead style={{ userSelect: "none" }}>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <Tr key={headerGroup.id}>
                        {headerGroup.headers.map((header, i) => {
                          return (
                            <Th
                              style={{ width: i === 1 ? "auto" : "1%" }}
                              key={header.id + "" + i}
                              colSpan={header.colSpan}
                            >
                              {header.isPlaceholder ? null : (
                                <span
                                  {...{
                                    style: header.column.getCanSort()
                                      ? {
                                          cursor: "pointer"
                                        }
                                      : undefined,

                                    onClick:
                                      header.column.getToggleSortingHandler()
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: header.column.getIsSorted()
                                        ? "bold"
                                        : "normal"
                                    }}
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </span>
                                </span>
                              )}
                            </Th>
                          );
                        })}
                      </Tr>
                    ))}
                  </Thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, i) => {
                      return (
                        <Tr key={row.id + "" + i}>
                          {row.getVisibleCells().map((cell, j) => {
                            return (
                              <Td key={cell.id + "" + j}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </Td>
                            );
                          })}
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableContainer>
              <Box display="inline-block">
                <Box float="right">
                  <Link href="/create-pipeline">
                    <Button colorScheme="green" size="sm">
                      Create Pipeline
                    </Button>
                  </Link>
                </Box>
              </Box>
            </Stack>
          </>
        )}

        {isAdminView && <DashboardAdminSection />}
      </PageContent>
    </>
  );
}

export function DashboardAdminSection(): ReactNode {
  return (
    <>
      <Stack
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        padding={4}
        marginTop={8}
      >
        <Heading size="md" marginBottom={4}>
          Admin
        </Heading>
        <UnorderedList>
          <ListItem>
            <a href={getAllHoneycombLinkForAllGenericIssuance()}>
              all generic issuance traces {getHoneycombQueryDurationStr()}
            </a>
          </ListItem>
          <li>
            <a href={getAllHoneycombLinkForAllGenericIssuanceHttp()}>
              all generic issuance http traces {getHoneycombQueryDurationStr()}
            </a>
          </li>
        </UnorderedList>
      </Stack>
    </>
  );
}
