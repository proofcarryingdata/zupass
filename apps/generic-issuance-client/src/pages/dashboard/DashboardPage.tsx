import {
  Badge,
  Box,
  HStack,
  Heading,
  ListItem,
  Spinner,
  Stack,
  UnorderedList
} from "@chakra-ui/react";
import {
  GenericIssuancePipelineListEntry,
  getError
} from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useContext, useEffect, useMemo } from "react";
import { HomeLink, PageContent, PodLink } from "../../components/Core";
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
  const userFromServer = useFetchSelf();
  const isAdminView = !!(ctx.isAdminMode && userFromServer?.value?.isAdmin);

  const pipelineEntries: GenericIssuancePipelineListEntry[] = useMemo(() => {
    if (!userFromServer?.value?.id) {
      return [];
    }

    const entries = pipelinesFromServer?.value ?? [];

    if (!isAdminView) {
      return entries.filter(
        (e) => e.pipeline.ownerUserId === userFromServer.value.id
      );
    }

    return entries;
  }, [isAdminView, pipelinesFromServer?.value, userFromServer?.value?.id]);

  useEffect(() => {
    if (!userJWT) {
      window.location.href = "/";
    }
  }, [userJWT]);

  const maybeRequestError: string | undefined = getError(
    pipelinesFromServer,
    userFromServer
  );

  if (maybeRequestError) {
    return (
      <>
        <GlobalPageHeader user={userFromServer} stytchClient={stytchClient} />
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

  if (!userFromServer || !pipelinesFromServer) {
    return (
      <>
        <GlobalPageHeader
          user={userFromServer}
          stytchClient={stytchClient}
          titleContent={(): ReactNode => <Spinner />}
        />
        <LoadingContent />
      </>
    );
  }

  return (
    <>
      <GlobalPageHeader
        user={userFromServer}
        stytchClient={stytchClient}
        titleContent={(): ReactNode => (
          <HStack>
            <Heading size="sm">Dashboard</Heading>
            {userFromServer.value && (
              <>
                <span>{userFromServer.value.email}</span>
                <Badge>{userFromServer.value.id}</Badge>
              </>
            )}
          </HStack>
        )}
      />
      <PageContent>
        {pipelineEntries.length ? (
          <PipelineTable entries={pipelineEntries} isAdminView={isAdminView} />
        ) : (
          isAdminView && <span>No pipelines. Create one below.</span>
        )}

        {isAdminView && <CreatePipelineButtonSection />}

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
