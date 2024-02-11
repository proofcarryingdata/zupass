import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Heading,
  Link,
  ListItem,
  Stack,
  UnorderedList
} from "@chakra-ui/react";
import {
  GenericIssuancePipelineListEntry,
  getError
} from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useContext, useEffect, useMemo } from "react";
import { Link as ReactLink } from "react-router-dom";
import { PageContent } from "../../components/Core";
import { Header } from "../../components/Header";
import { GIContext } from "../../helpers/Context";
import { useFetchAllPipelines } from "../../helpers/useFetchAllPipelines";
import { useFetchSelf } from "../../helpers/useFetchSelf";
import { useJWT } from "../../helpers/userHooks";
import {
  getAllHoneycombLinkForAllGenericIssuance,
  getAllHoneycombLinkForAllGenericIssuanceHttp,
  getHoneycombQueryDurationStr
} from "../../helpers/util";
import { CreatePipelineButtonSection } from "./CreatePipelineButtonSection";
import { PipelineTable } from "./PipelineTable";

export default function Dashboard(): ReactNode {
  const stytchClient = useStytch();
  const userJWT = useJWT();
  const ctx = useContext(GIContext);
  const pipelinesFromServer = useFetchAllPipelines();
  const user = useFetchSelf();

  const isAdminView = !!(ctx.isAdminMode && user?.value?.isAdmin);

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
        {pipelineEntries.length ? (
          <PipelineTable entries={pipelineEntries} isAdminView={isAdminView} />
        ) : (
          <p>No pipelines right now - go create some!</p>
        )}

        <CreatePipelineButtonSection />

        {isAdminView && <DashboardAdminSection />}
      </PageContent>
    </>
  );
}

export function DashboardAdminSection(): ReactNode {
  return (
    <>
      <Stack overflow="hidden" padding={4} marginTop={8}>
        <Heading size="md" marginBottom={4}>
          More Info
        </Heading>
        <UnorderedList>
          <ListItem>
            <Link
              as={ReactLink}
              href={getAllHoneycombLinkForAllGenericIssuance()}
            >
              all generic issuance traces {getHoneycombQueryDurationStr()}
              &nbsp;
              <ExternalLinkIcon />
            </Link>
          </ListItem>
          <li>
            <Link
              as={ReactLink}
              href={getAllHoneycombLinkForAllGenericIssuanceHttp()}
            >
              all generic issuance http traces {getHoneycombQueryDurationStr()}
              &nbsp;
              <ExternalLinkIcon />
            </Link>
          </li>
        </UnorderedList>
      </Stack>
    </>
  );
}
