import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Heading,
  Link,
  ListItem,
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
import { LatestAtomsSection } from "./LatestAtomsSection";
import { LoadSummarySection } from "./LoadSummarySection";

export function PipelineDetailView({
  pipelineInfo,
  pipelineFromServer,
  isAdminView
}: {
  pipelineInfo: PipelineInfoResponseValue;
  pipelineFromServer: PipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  return (
    <Accordion>
      <AccordionItem>
        <h2>
          <AccordionButton>Pipeline Info</AccordionButton>
        </h2>

        <AccordionPanel>
          <Heading size="md">
            {pipelineFromServer.options.name ? (
              pipelineFromServer.options.name
            ) : (
              <span>'no name'</span>
            )}
          </Heading>
          {pipelineInfo.feeds && (
            <>
              <Heading size="lg">Feeds</Heading>
              <ol>
                {pipelineInfo.feeds?.map((feed) => (
                  <li key={feed.url}>
                    <b>{feed.name}</b>
                    {" - "}
                    <a
                      href={`${
                        process.env.PASSPORT_CLIENT_URL
                      }/#/add-subscription?url=${encodeURIComponent(feed.url)}`}
                    >
                      Subscription link
                    </a>
                    {" - "}
                    <a href={feed.url}>Feed Link</a>{" "}
                  </li>
                ))}
              </ol>
            </>
          )}
        </AccordionPanel>
      </AccordionItem>
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
          <LoadSummarySection lastLoad={pipelineInfo.loadSummary} />
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
