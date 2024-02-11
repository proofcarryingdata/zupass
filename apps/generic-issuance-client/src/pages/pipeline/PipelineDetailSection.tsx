import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Link,
  ListItem,
  OrderedList,
  UnorderedList
} from "@chakra-ui/react";
import {
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import { ReactNode } from "react";
import { Link as ReactLink } from "react-router-dom";
import {
  getAllHoneycombLinkForPipeline,
  getHoneycombQueryDurationStr,
  getLoadTraceHoneycombLinkForPipeline
} from "../../helpers/util";
import { PipelineTable } from "../dashboard/PipelineTable";
import { LatestAtomsSection } from "./LatestAtomsSection";
import { LoadSummarySection } from "./LoadSummarySection";

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
    <Accordion defaultIndex={0}>
      <AccordionItem>
        <h2>
          <AccordionButton>Pipeline Info</AccordionButton>
        </h2>

        <AccordionPanel>
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
        </AccordionPanel>
      </AccordionItem>

      {pipelineInfo.feeds && (
        <AccordionItem>
          <AccordionButton>Feed Info</AccordionButton>
          <AccordionPanel>
            <OrderedList>
              {pipelineInfo.feeds.map((feed) => (
                <ListItem key={feed.url}>
                  <b>{feed.name}</b>
                  {" - "}
                  <Link
                    href={`${
                      process.env.PASSPORT_CLIENT_URL
                    }/#/add-subscription?url=${encodeURIComponent(feed.url)}`}
                  >
                    Subscription link <ExternalLinkIcon />
                  </Link>
                  {" - "}
                  <Link href={feed.url}>
                    Feed Link <ExternalLinkIcon />
                  </Link>{" "}
                </ListItem>
              ))}
            </OrderedList>
          </AccordionPanel>
        </AccordionItem>
      )}

      {isAdminView && (
        <AccordionItem>
          <AccordionButton>Admin Details</AccordionButton>
          <AccordionPanel>
            Links to this pipeline's traces on Honeycomb:
            <UnorderedList>
              <ListItem>
                <Link
                  as={ReactLink}
                  href={getLoadTraceHoneycombLinkForPipeline(
                    pipelineFromServer.id
                  )}
                >
                  data load traces {getHoneycombQueryDurationStr()}
                  &nbsp;
                  <ExternalLinkIcon />
                </Link>
              </ListItem>
              <li>
                <Link
                  as={ReactLink}
                  href={getAllHoneycombLinkForPipeline(pipelineFromServer.id)}
                >
                  all traces related to this pipeline{" "}
                  {getHoneycombQueryDurationStr()}
                  &nbsp;
                  <ExternalLinkIcon />
                </Link>
              </li>
            </UnorderedList>
          </AccordionPanel>
        </AccordionItem>
      )}
      <AccordionItem>
        <AccordionButton>Last Load</AccordionButton>
        <AccordionPanel>
          <LoadSummarySection lastLoad={pipelineInfo.lastLoad} />
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem>
        <AccordionButton>Pipeline Data</AccordionButton>
        <AccordionPanel>
          <LatestAtomsSection latestAtoms={pipelineInfo.latestAtoms} />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
