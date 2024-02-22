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
import { ReactNode, useEffect, useMemo } from "react";
import { HomeLink, PageContent, PodLink } from "../../components/Core";
import { LoadingContent } from "../../components/LoadingContent";
import { GlobalPageHeader } from "../../components/header/GlobalPageHeader";
import { useFetchAllPipelines } from "../../helpers/useFetchAllPipelines";
import { useFetchSelf } from "../../helpers/useFetchSelf";
import { useIsAdminView } from "../../helpers/useIsAdminView";
import { useJWT } from "../../helpers/userHooks";
import {
  getAllHoneycombLinkForAllGenericIssuance,
  getAllHoneycombLinkForAllGenericIssuanceHttp,
  getHoneycombQueryDurationStr
} from "../../helpers/util";
import { CreatePipelineButtonSection } from "./CreatePipelineButtonSection";
import { PipelineTable } from "./PipelineTable";

export default function DashboardPage(): ReactNode {
  const userJWT = useJWT();
  const pipelines = useFetchAllPipelines();
  const user = useFetchSelf();
  const isAdminView = useIsAdminView(user?.value);

  const pipelineEntries: GenericIssuancePipelineListEntry[] = useMemo(() => {
    if (!user?.value?.id) {
      return [];
    }

    const entries = pipelines?.value ?? [];

    if (!isAdminView) {
      return entries.filter((e) => e.pipeline.ownerUserId === user.value.id);
    }

    return entries;
  }, [isAdminView, pipelines?.value, user?.value?.id]);

  useEffect(() => {
    if (!userJWT) {
      window.location.href = "/";
    }
  }, [userJWT]);

  const maybeRequestError: string | undefined = getError(pipelines, user);

  if (maybeRequestError) {
    return (
      <>
        <GlobalPageHeader user={user} />
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

  if (!user || !pipelines) {
    return (
      <>
        <GlobalPageHeader
          user={user}
          titleContent={(): ReactNode => <Spinner />}
        />
        <LoadingContent />
      </>
    );
  }

  return (
    <>
      <GlobalPageHeader
        user={user}
        titleContent={(): ReactNode => (
          <HStack>
            <CreatePipelineButtonSection />

            <Heading size="sm">Dashboard</Heading>
            {user.value && (
              <>
                <span>{user.value.email}</span>
                <Badge>{user.value.id}</Badge>
              </>
            )}
          </HStack>
        )}
      />
      <PageContent>
        {pipelineEntries.length ? (
          <PipelineTable entries={pipelineEntries} isAdminView={isAdminView} />
        ) : (
          <span>No pipelines. Create one above.</span>
        )}

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
