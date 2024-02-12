import { Box, Heading, ListItem, Stack, UnorderedList } from "@chakra-ui/react";
import {
  GenericIssuancePipelineListEntry,
  getError
} from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useContext, useEffect, useMemo } from "react";
import {
  HomeLink,
  PageContent,
  PodLink,
  SmallSpinner
} from "../../components/Core";
import { LoadingContent } from "../../components/LoadingContent";
import { GlobalPageHeader } from "../../components/header/GlobalPageHeader";
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

export default function DashboardPage(): ReactNode {
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
        <GlobalPageHeader user={user} stytchClient={stytchClient} />
        <PageContent>
          <Heading size="md" colorScheme="orange">
            Error Loading Page
          </Heading>
          <Box>
            {maybeRequestError}
            <br />
            go <HomeLink />
          </Box>
        </PageContent>
      </>
    );
  }

  if (!user || !pipelinesFromServer) {
    return (
      <>
        <GlobalPageHeader
          user={user}
          stytchClient={stytchClient}
          titleContent={(): ReactNode => <SmallSpinner />}
        />
        <LoadingContent />
      </>
    );
  }

  return (
    <>
      <GlobalPageHeader
        user={user}
        stytchClient={stytchClient}
        titleContent={(): ReactNode => <Heading size="sm">Dashboard</Heading>}
      />
      <PageContent>
        {pipelineEntries.length ? (
          <PipelineTable entries={pipelineEntries} isAdminView={isAdminView} />
        ) : (
          <span>No pipelines right now - go create some!</span>
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
            <PodLink
              isExternal={true}
              to={getAllHoneycombLinkForAllGenericIssuance()}
            >
              all generic issuance traces {getHoneycombQueryDurationStr()}
            </PodLink>
          </ListItem>
          <li>
            <PodLink
              isExternal={true}
              to={getAllHoneycombLinkForAllGenericIssuanceHttp()}
            >
              all generic issuance http traces {getHoneycombQueryDurationStr()}
            </PodLink>
          </li>
        </UnorderedList>
      </Stack>
    </>
  );
}
