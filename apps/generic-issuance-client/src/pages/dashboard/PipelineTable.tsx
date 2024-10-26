import { Table, TableContainer, Td, Th, Thead, Tr } from "@chakra-ui/react";
import {
  GenericIssuancePipelineListEntry,
  PipelineDefinition,
  PipelineLogLevel,
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
import { ReactNode, useCallback, useMemo, useState } from "react";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { PodLink } from "../../components/Core";
import {
  PipelineDataSourceTag,
  PipelineDisplayNameText,
  PipelineHasCacheTag,
  PipelineStatusTag,
  PipelineTypeTag,
  PipelineWarningsTag,
  pipelineDetailPagePath,
  pipelineDisplayNameStr,
  pipelineStatusStr,
  timeAgoStr
} from "../../components/PipelineDisplayUtils";
import {
  getAllHoneycombLinkForPipeline,
  getLoadTraceHoneycombLinkForPipeline
} from "../../helpers/util";

export type PipelineStateDisplay = "Loading" | "Loaded" | "Error" | "Paused";
export type PipelineCacheStatus = "Disabled" | "Empty" | "Cached";

export type PipelineRow = {
  status: PipelineStateDisplay;
  warnings: number;
  fromCache: boolean;
  cacheStatus: PipelineCacheStatus;
  type: PipelineType;
  owner: string;
  timeCreated: string;
  timeUpdated: string;
  important: boolean;
  id: string;
  loadTraceLink: string;
  allTraceLink: string;
  lastLoad?: string;
  name?: string;
  displayName: string;
  pipeline: PipelineDefinition;
};

export function PipelineTable({
  entries,
  isAdminView,
  singleRowMode
}: {
  entries: GenericIssuancePipelineListEntry[];
  isAdminView: boolean;
  singleRowMode?: boolean;
}): ReactNode {
  const entryToRow = useCallback(
    (entry: GenericIssuancePipelineListEntry): PipelineRow => {
      return {
        status: pipelineStatusStr(entry),
        fromCache: !!entry.extraInfo.lastLoad?.fromCache,
        warnings:
          entry.extraInfo?.lastLoad?.latestLogs?.filter(
            (log) => log.level === PipelineLogLevel.Warning
          ).length ?? 0,
        cacheStatus:
          entry.pipeline.options.disableCache === true
            ? "Disabled"
            : entry.extraInfo.hasCachedLoad
            ? "Cached"
            : "Empty",
        type: entry.pipeline.type,
        owner: entry.extraInfo.ownerEmail ?? "",
        timeCreated: entry.pipeline.timeCreated,
        timeUpdated: entry.pipeline.timeUpdated,
        important: !!entry.pipeline.options?.important,
        id: entry.pipeline.id,
        loadTraceLink: getLoadTraceHoneycombLinkForPipeline(entry.pipeline.id),
        allTraceLink: getAllHoneycombLinkForPipeline(entry.pipeline.id),
        lastLoad: entry.extraInfo.lastLoad?.lastRunEndTimestamp,
        name: entry.pipeline.options?.name,
        displayName: pipelineDisplayNameStr(entry.pipeline),
        pipeline: entry.pipeline
      };
    },
    []
  );

  const rows: PipelineRow[] = useMemo(() => {
    return entries.map(entryToRow);
  }, [entryToRow, entries]);

  const columnHelper = createColumnHelper<PipelineRow>();
  const columns: Array<ColumnDef<PipelineRow> | undefined> = useMemo(
    () => [
      singleRowMode
        ? undefined
        : columnHelper.accessor("displayName", {
            header: "name",
            cell: (table) => (
              <PipelineDisplayNameText pipeline={table.row.original.pipeline} />
            )
          }),

      columnHelper.accessor("important", {
        header: "important",
        cell: (props) => !!props.row.original.important + "",
        enableHiding: true
      }),

      columnHelper.accessor("timeUpdated", {
        header: "edited",
        cell: (props) => timeAgoStr(props.row.original.timeUpdated)
      }),

      columnHelper.accessor("timeCreated", {
        header: "created",
        cell: (props) => timeAgoStr(props.row.original.timeCreated)
      }),

      isAdminView
        ? columnHelper.accessor("owner", {
            header: "Owner",
            cell: (props) => props.row.original.owner
          })
        : undefined,

      columnHelper.accessor("type", {
        header: "type",
        cell: (props) => <PipelineTypeTag type={props.row.original.type} />
      }),

      columnHelper.accessor("warnings", {
        header: "Warnings",
        cell: (props) => (
          <PipelineWarningsTag warnings={props.row.original.warnings} />
        )
      }),

      columnHelper.accessor("status", {
        header: "Status",
        cell: (props) => (
          <PipelineStatusTag status={props.row.original.status} />
        )
      }),

      columnHelper.accessor("fromCache", {
        header: "Serving From",
        cell: (props) => (
          <PipelineDataSourceTag fromCache={props.row.original.fromCache} />
        )
      }),

      columnHelper.accessor("cacheStatus", {
        header: "Disk Cache",
        cell: (props) => (
          <PipelineHasCacheTag cacheStatus={props.row.original.cacheStatus} />
        )
      }),

      columnHelper.accessor("lastLoad", {
        header: "Last Load",
        cell: (props) => timeAgoStr(props.row.original.lastLoad)
      }),

      isAdminView
        ? columnHelper.accessor("loadTraceLink", {
            enableSorting: false,
            header: "load",
            cell: (table) => (
              <PodLink to={table.row.original.loadTraceLink} isExternal={true}>
                load
              </PodLink>
            )
          })
        : undefined,

      isAdminView
        ? columnHelper.accessor("allTraceLink", {
            enableSorting: false,
            header: "all",
            cell: (table) => (
              <PodLink to={table.row.original.allTraceLink} isExternal={true}>
                all
              </PodLink>
            )
          })
        : undefined
    ],
    [columnHelper, isAdminView, singleRowMode]
  );
  const filteredColumns = useMemo(() => {
    return columns.filter((r) => !!r) as Array<ColumnDef<PipelineRow>>;
  }, [columns]);
  const [sorting, setSorting] = useState<SortingState>(
    singleRowMode
      ? []
      : [
          {
            id: "important",
            desc: true
          },
          {
            id: "timeUpdated",
            desc: true
          }
        ]
  );

  const table = useReactTable({
    columns: filteredColumns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnVisibility: {
        important: false
      }
    },
    onSortingChange: singleRowMode ? undefined : setSorting
  });

  return (
    <Container singleRowMode={singleRowMode}>
      <TableContainer>
        <Table size="sm">
          <Thead style={{ userSelect: "none" }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header, i) => {
                  return (
                    <Th
                      style={
                        singleRowMode
                          ? undefined
                          : { width: i === 0 ? "auto" : "1%" }
                      }
                      key={header.id + "" + i}
                      colSpan={header.colSpan}
                    >
                      {header.isPlaceholder ? null : (
                        <span
                          {...{
                            style:
                              header.column.getCanSort() && !singleRowMode
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
                <Tr
                  key={row.id + "" + i}
                  onClick={(): void => {
                    if (!singleRowMode) {
                      window.location.hash = `${pipelineDetailPagePath(
                        row.original.id
                      )}`;
                    }
                  }}
                >
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
    </Container>
  );
}

const Container = styled.div`
  ${({
    singleRowMode
  }: {
    singleRowMode?: boolean;
  }): FlattenSimpleInterpolation => css`
  table {
    ${
      singleRowMode
        ? css`
            * {
              border: none;
            }
          `
        : ""
    }
    tbody {
      user-select: none;
      ${
        singleRowMode
          ? css``
          : css`
          tr {
            transition: background-color 150ms;
            cursor: pointer;
            &:hover {
              background-color: rgba(255, 255, 255, 0.07);

              &:active {
                background-color: rgba(255, 255, 255, 0.1);
              }
            }`
      }
    }}
  }
  `}
`;
