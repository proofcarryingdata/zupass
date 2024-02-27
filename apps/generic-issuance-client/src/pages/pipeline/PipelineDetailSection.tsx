import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  ListItem,
  UnorderedList
} from "@chakra-ui/react";
import {
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { PodLink } from "../../components/Core";
import { LastLoaded } from "../../components/LastLoaded";
import {
  getAllHoneycombLinkForPipeline,
  getHoneycombQueryDurationStr,
  getLoadTraceHoneycombLinkForPipeline
} from "../../helpers/util";
import { PipelineLatestConsumersSection } from "./DetailsSections/PipelineLatestConsumersSection";
import { PipelineLatestDataSection } from "./DetailsSections/PipelineLatestDataSection";
import { PipelineLatestLogsSection } from "./DetailsSections/PipelineLatestLogsSection";
import {
  PipelineManualTicketsSection,
  shouldShowManualTicketsSection
} from "./DetailsSections/PipelineManualTicketsSection";
import { PipelineSemaphoreGroupsSection } from "./DetailsSections/PipelineSemaphoreGroupsSection";

export function PipelineDetailSection({
  pipelineInfo,
  pipeline,
  isAdminView
}: {
  pipelineInfo: PipelineInfoResponseValue;
  pipeline: PipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  return (
    <>
      <Box padding={4} mb={4}>
        {pipelineInfo.feeds &&
          pipelineInfo.feeds.map((feed, i) => (
            <Box key={feed.url} mb={i === 0 ? 0 : 2}>
              <PodLink
                hideIcon
                isExternal
                to={`${
                  process.env.PASSPORT_CLIENT_URL
                }/#/add-subscription?url=${encodeURIComponent(feed.url)}`}
              >
                <Button colorScheme="green">
                  <Box mr={2}>{feed.name} Feed for Zupass</Box>{" "}
                  <ExternalLinkIcon mx="2px" />
                </Button>
              </PodLink>
              <Box ml={4} display="inline-block"></Box>
              {isAdminView && (
                <PodLink to={feed.url} isExternal={true}>
                  Feed Link
                </PodLink>
              )}
            </Box>
          ))}
      </Box>

      <Accordion defaultIndex={[]} allowMultiple={true}>
        {shouldShowManualTicketsSection(pipeline) && (
          <AccordionItem>
            <AccordionButton>Manual Tickets</AccordionButton>
            <AccordionPanel>
              <PipelineManualTicketsSection
                pipeline={pipeline}
                isAdminView={isAdminView}
              />
            </AccordionPanel>
          </AccordionItem>
        )}

        <AccordionItem>
          <AccordionButton>Latest Logs</AccordionButton>
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

        <AccordionItem>
          <AccordionButton>Consumers</AccordionButton>
          <AccordionPanel>
            <PipelineLatestConsumersSection
              latestConsumers={pipelineInfo.latestConsumers}
            />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>Semaphore Groups</AccordionButton>
          <AccordionPanel>
            <PipelineSemaphoreGroupsSection lastLoad={pipelineInfo.lastLoad} />
          </AccordionPanel>
        </AccordionItem>

        {isAdminView && (
          <AccordionItem>
            <AccordionButton>
              Tracing Links&nbsp;<Badge colorScheme="gray">Admin</Badge>
            </AccordionButton>
            <AccordionPanel>
              <UnorderedList>
                <ListItem>
                  <PodLink
                    isExternal={true}
                    to={getLoadTraceHoneycombLinkForPipeline(pipeline.id)}
                  >
                    data load traces {getHoneycombQueryDurationStr()}
                  </PodLink>
                </ListItem>
                <li>
                  <PodLink
                    isExternal={true}
                    to={getAllHoneycombLinkForPipeline(pipeline.id)}
                  >
                    all traces related to this pipeline{" "}
                    {getHoneycombQueryDurationStr()}
                  </PodLink>
                </li>
              </UnorderedList>
            </AccordionPanel>
          </AccordionItem>
        )}
      </Accordion>

      <LastLoaded />
    </>
  );
}
