import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Heading,
  ListItem,
  UnorderedList
} from "@chakra-ui/react";
import {
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import styled from "styled-components";
import { PodLink } from "../../components/Core";
import { pipelineDisplayNameStr } from "../../components/PipelineDisplayUtils";
import { useGIContext } from "../../helpers/Context";
import {
  getAllHoneycombLinkForPipeline,
  getHoneycombQueryDurationStr,
  getLoadTraceHoneycombLinkForPipeline
} from "../../helpers/util";
import {
  PipelineAddManualTicketSection,
  supportsManualTicketTable
} from "./DetailsSections/PipelineAddManualTicketSection";
import {
  PipelineDisplayManualTicketsSection,
  supportsAddingManualTickets
} from "./DetailsSections/PipelineDisplayManualTicketsSection";
import { PipelineHistorySection } from "./DetailsSections/PipelineHistorySection";
import { PipelineLatestConsumersSection } from "./DetailsSections/PipelineLatestConsumersSection";
import { PipelineLatestDataSection } from "./DetailsSections/PipelineLatestDataSection";
import { PipelineLatestLogsSection } from "./DetailsSections/PipelineLatestLogsSection";
import { PipelineSemaphoreGroupsSection } from "./DetailsSections/PipelineSemaphoreGroupsSection";
import { PipelineRow } from "./PipelineEditSection/PipelineRow";

export function PipelineDetailSection({
  pipelineInfo,
  pipeline,
  isAdminView
}: {
  pipelineInfo: PipelineInfoResponseValue;
  pipeline: PipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  const ctx = useGIContext();

  return (
    <>
      <Box ml={4} mr={4}>
        <Heading>
          {pipelineDisplayNameStr(pipeline)} <CollapseAllButton />
        </Heading>
      </Box>

      <Box padding={4} mb={4}>
        <PipelineRow {...{ pipeline, pipelineInfo }} />
      </Box>

      <Accordion
        index={ctx.pipelineDetailsAccordionState ?? []}
        onChange={(index: number[]): void => {
          ctx.setState({
            pipelineDetailsAccordionState: index
          });
        }}
        allowMultiple={true}
      >
        <AccordionItem>
          <AccordionButton>Zupass Feed</AccordionButton>
          <AccordionPanel>
            <SectionContainer>
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
            </SectionContainer>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>Feed Subscribers</AccordionButton>
          <AccordionPanel>
            <SectionContainer>
              <PipelineLatestConsumersSection
                latestConsumers={pipelineInfo.latestConsumers}
              />
            </SectionContainer>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>Semaphore Groups</AccordionButton>
          <AccordionPanel>
            <SectionContainer>
              <PipelineSemaphoreGroupsSection
                lastLoad={pipelineInfo.lastLoad}
              />
            </SectionContainer>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>Logs</AccordionButton>
          <AccordionPanel>
            <PipelineLatestLogsSection lastLoad={pipelineInfo.lastLoad} />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>Data</AccordionButton>
          <AccordionPanel>
            <PipelineLatestDataSection latestAtoms={pipelineInfo.latestAtoms} />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>Edit Log</AccordionButton>
          <AccordionPanel>
            <SectionContainer>
              <PipelineHistorySection pipelineInfo={pipelineInfo} />
            </SectionContainer>
          </AccordionPanel>
        </AccordionItem>

        {isAdminView && (
          <>
            {supportsManualTicketTable(pipeline) && isAdminView && (
              <AccordionItem>
                <AccordionButton>
                  Add Manual Ticket&nbsp;<Badge colorScheme="gray">Admin</Badge>
                </AccordionButton>
                <AccordionPanel>
                  <SectionContainer>
                    <PipelineAddManualTicketSection
                      pipeline={pipeline}
                      isAdminView={isAdminView}
                    />
                  </SectionContainer>
                </AccordionPanel>
              </AccordionItem>
            )}

            {supportsAddingManualTickets(pipeline) && isAdminView && (
              <AccordionItem>
                <AccordionButton>
                  Existing Manual Tickets&nbsp;
                  <Badge colorScheme="gray">Admin</Badge>
                </AccordionButton>
                <AccordionPanel>
                  <SectionContainer>
                    <PipelineDisplayManualTicketsSection
                      pipeline={pipeline}
                      isAdminView={isAdminView}
                    />
                  </SectionContainer>
                </AccordionPanel>
              </AccordionItem>
            )}
            <AccordionItem>
              <AccordionButton>
                Tracing Links&nbsp;<Badge colorScheme="gray">Admin</Badge>
              </AccordionButton>
              <AccordionPanel>
                <SectionContainer>
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
                </SectionContainer>
              </AccordionPanel>
            </AccordionItem>
          </>
        )}
      </Accordion>
    </>
  );
}

function CollapseAllButton(): ReactNode {
  const ctx = useGIContext();
  const disabled =
    !ctx.pipelineDetailsAccordionState ||
    ctx.pipelineDetailsAccordionState.length === 0;

  return (
    <Button
      ml={2}
      size={"sm"}
      isDisabled={disabled}
      onClick={(): void => {
        ctx.setState({
          pipelineDetailsAccordionState: []
        });
      }}
    >
      Collapse
    </Button>
  );
}

export const SectionContainer = styled.div`
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.09);
  min-width: 8px;
  padding: 16px;
  display: block;
`;
