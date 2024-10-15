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
  Text,
  UnorderedList
} from "@chakra-ui/react";
import {
  PipelineDefinition,
  PipelineInfoResponseValue,
  isCSVTicketPipelineDefinition
} from "@pcd/passport-interface";
import _ from "lodash";
import { ReactNode } from "react";
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
  supportsAddingManualTickets
} from "./DetailsSections/PipelineAddManualTicketSection";
import {
  PipelineDisplayManualTicketsSection,
  supportsManualTicketTable
} from "./DetailsSections/PipelineDisplayManualTicketsSection";
import { PipelineLatestConsumersSection } from "./DetailsSections/PipelineLatestConsumersSection";
import { PipelineLatestDataSection } from "./DetailsSections/PipelineLatestDataSection";
import { PipelineLatestLogsSection } from "./DetailsSections/PipelineLatestLogsSection";
import { PipelineProductsSection } from "./DetailsSections/PipelineProductsSection";
import { PipelineSemaphoreGroupsSection } from "./DetailsSections/PipelineSemaphoreGroupsSection";
import { PipelineVersionHistorySection } from "./DetailsSections/PipelineVersionHistorySection";
import { PipelineZuAuthConfigSection } from "./DetailsSections/PipelineZuAuthConfig";
import { SendEmailSection } from "./DetailsSections/SendEmailSection";
import { CappedSectionContainer, SectionContainer } from "./SectionContainer";

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
      <Box m={4}>
        <Heading>
          {pipelineDisplayNameStr(pipeline)} <CollapseAllButton />{" "}
          <ExpandAllButton />
        </Heading>
        <Text>by {pipelineInfo.ownerEmail}</Text>
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

        {isCSVTicketPipelineDefinition(pipeline) && (
          <AccordionItem>
            <AccordionButton>Products</AccordionButton>
            <AccordionPanel>
              <PipelineProductsSection pipeline={pipeline} />
            </AccordionPanel>
          </AccordionItem>
        )}

        {isAdminView && (
          <>
            <AccordionItem>
              <AccordionButton>Feed Subscribers</AccordionButton>
              <AccordionPanel>
                <CappedSectionContainer>
                  <PipelineLatestConsumersSection
                    latestConsumers={pipelineInfo.latestConsumers}
                  />
                </CappedSectionContainer>
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
              <AccordionButton>ZuAuth Config</AccordionButton>
              <AccordionPanel>
                <CappedSectionContainer>
                  <PipelineZuAuthConfigSection
                    pipelineZuAuthConfig={pipelineInfo.zuAuthConfig}
                  />
                </CappedSectionContainer>
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
                <PipelineLatestDataSection
                  lastLoad={pipelineInfo.lastLoad}
                  latestAtoms={pipelineInfo.latestAtoms}
                />
              </AccordionPanel>
            </AccordionItem>

            <AccordionItem>
              <AccordionButton>Version History</AccordionButton>
              <AccordionPanel>
                <CappedSectionContainer>
                  <PipelineVersionHistorySection pipelineInfo={pipelineInfo} />
                </CappedSectionContainer>
              </AccordionPanel>
            </AccordionItem>

            {supportsAddingManualTickets(pipeline) && isAdminView && (
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

            {supportsManualTicketTable(pipeline) && isAdminView && (
              <AccordionItem>
                <AccordionButton>
                  Existing Manual Tickets&nbsp;
                  <Badge colorScheme="gray">Admin</Badge>
                </AccordionButton>
                <AccordionPanel>
                  <CappedSectionContainer>
                    <PipelineDisplayManualTicketsSection
                      pipeline={pipeline}
                      isAdminView={isAdminView}
                    />
                  </CappedSectionContainer>
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
                    <ListItem>
                      <PodLink
                        isExternal={true}
                        to={getAllHoneycombLinkForPipeline(pipeline.id)}
                      >
                        all traces related to this pipeline{" "}
                        {getHoneycombQueryDurationStr()}
                      </PodLink>
                    </ListItem>
                  </UnorderedList>
                </SectionContainer>
              </AccordionPanel>
            </AccordionItem>

            <AccordionItem>
              <AccordionButton>
                Email Send&nbsp;<Badge colorScheme="gray">Admin</Badge>
              </AccordionButton>
              <AccordionPanel>
                <SectionContainer>
                  <SendEmailSection pipeline={pipeline} />
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
      Collapse All
    </Button>
  );
}

const EXPANDED = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
function ExpandAllButton(): ReactNode {
  const ctx = useGIContext();
  const disabled =
    !ctx.pipelineDetailsAccordionState ||
    _.isEqual(ctx.pipelineDetailsAccordionState, EXPANDED);

  return (
    <Button
      ml={2}
      size={"sm"}
      isDisabled={disabled}
      onClick={(): void => {
        ctx.setState({
          pipelineDetailsAccordionState: EXPANDED
        });
      }}
    >
      Expand All
    </Button>
  );
}
