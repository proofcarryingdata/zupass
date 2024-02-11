import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Link,
  Table,
  TableContainer,
  Tag,
  TagLabel,
  Td,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import {
  GenericIssuancePipelineListEntry,
  PipelineType
} from "@pcd/passport-interface";
import {
  ColumnDef,
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link as ReactLink } from "react-router-dom";
import {
  pipelineCreatedAt,
  pipelineIconFromStr,
  pipelineLastEdit,
  pipelineLink
} from "../../components/pipeline-display/PipelineDetails";
import {
  getAllHoneycombLinkForPipeline,
  getLoadTraceHoneycombLinkForPipeline,
  timeAgo
} from "../../helpers/util";

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

export function PipelineTable({
  entries,
  isAdminView
}: {
  entries: GenericIssuancePipelineListEntry[];
  isAdminView: boolean;
}): ReactNode {
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
    return entries.map(entryToRow);
  }, [entryToRow, entries]);

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
                    as={ReactLink}
                    href={table.row.original.loadTraceLink}
                    isExternal={true}
                  >
                    load
                    <ExternalLinkIcon mx="2px" />
                  </Link>
                  &nbsp;
                  <Link as={ReactLink} href={value} isExternal={true}>
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

  return (
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

                          onClick: header.column.getToggleSortingHandler()
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
  );
}
