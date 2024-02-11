import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  ListItem,
  OrderedList,
  Stack,
  UnorderedList
} from "@chakra-ui/react";
import {
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PodLink } from "../../components/Core";
import {
  getAllHoneycombLinkForPipeline,
  getHoneycombQueryDurationStr,
  getLoadTraceHoneycombLinkForPipeline
} from "../../helpers/util";
import { PipelineTable } from "../dashboard/PipelineTable";
import { PipelineLatestDataSection } from "./PipelineLatestDataSection";
import { PipelineLatestLoadSection } from "./PipelineLatestLoadSection";
import { PipelineLatestLogsSection } from "./PipelineLatestLogsSection";

export function PipelineDetailSection({
  pipelineInfo,
  pipelineFromServer,
  isAdminView
}: {
  pipelineInfo: PipelineInfoResponseValue;
  pipelineFromServer: PipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  return (
    <Stack maxW={"100%"} gap={4}>
      <Box>
        <PipelineTable
          entries={[
            {
              extraInfo: pipelineInfo,
              pipeline: pipelineFromServer
            }
          ]}
          isAdminView={isAdminView}
          singleRowMode={true}
        />
      </Box>

      <Accordion defaultIndex={0}>
        {pipelineInfo.feeds && (
          <AccordionItem>
            <AccordionButton>Zupass PCD Feeds</AccordionButton>
            <AccordionPanel>
              <OrderedList>
                {pipelineInfo.feeds.map((feed) => (
                  <ListItem key={feed.url}>
                    <b>{feed.name}</b>
                    {" - "}
                    <PodLink
                      isExternal={true}
                      to={`${
                        process.env.PASSPORT_CLIENT_URL
                      }/#/add-subscription?url=${encodeURIComponent(feed.url)}`}
                    >
                      Subscription Link
                    </PodLink>
                    {" - "}
                    <PodLink to={feed.url} isExternal={true}>
                      Feed Link
                    </PodLink>{" "}
                  </ListItem>
                ))}
              </OrderedList>
            </AccordionPanel>
          </AccordionItem>
        )}
        {isAdminView && (
          <AccordionItem>
            <AccordionButton>
              Tracing Links&nbsp;<Badge colorScheme="orange">Admin</Badge>
            </AccordionButton>
            <AccordionPanel>
              <UnorderedList>
                <ListItem>
                  <PodLink
                    isExternal={true}
                    to={getLoadTraceHoneycombLinkForPipeline(
                      pipelineFromServer.id
                    )}
                  >
                    data load traces {getHoneycombQueryDurationStr()}
                  </PodLink>
                </ListItem>
                <li>
                  <PodLink
                    isExternal={true}
                    to={getAllHoneycombLinkForPipeline(pipelineFromServer.id)}
                  >
                    all traces related to this pipeline{" "}
                    {getHoneycombQueryDurationStr()}
                  </PodLink>
                </li>
              </UnorderedList>
            </AccordionPanel>
          </AccordionItem>
        )}
        <AccordionItem>
          <AccordionButton>Last Load</AccordionButton>
          <AccordionPanel>
            <PipelineLatestLoadSection lastLoad={pipelineInfo.lastLoad} />
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton>Logs</AccordionButton>
          <AccordionPanel>
            <PipelineLatestLogsSection lastLoad={pipelineInfo.lastLoad} />
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton>Latest Data</AccordionButton>
          <AccordionPanel>
            <PipelineLatestDataSection latestAtoms={pipelineInfo.latestAtoms} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Stack>
  );
}
