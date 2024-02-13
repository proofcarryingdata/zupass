import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Badge,
  ListItem,
  OrderedList,
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
import { PipelineLatestDataSection } from "./PipelineLatestDataSection";
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
    <>
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
      </Accordion>

      <LastLoaded />
    </>
  );
}
