import { Badge, HStack, Heading, Spinner } from "@chakra-ui/react";
import { getError } from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { PageContent } from "../../components/Core";
import { LoadingContent } from "../../components/LoadingContent";
import { PipelineDisplayNameText } from "../../components/PipelineDisplayUtils";
import { GlobalPageHeader } from "../../components/header/GlobalPageHeader";
import { GIContext } from "../../helpers/Context";
import { useFetchPipeline } from "../../helpers/useFetchPipeline";
import { useFetchPipelineInfo } from "../../helpers/useFetchPipelineInfo";
import { useFetchSelf } from "../../helpers/useFetchSelf";
import { useJWT } from "../../helpers/userHooks";
import { PipelineDetailSection } from "./PipelineDetailSection";
import { PipelineEditSection } from "./PipelineEditSection";

/**
 * Page a user can navigate to to view and edit information regarding a
 * given pipeline.
 *
 * e.g. /#/pipelines/3fe06df6-7a3f-45df-8046-44dca6e4e9ea
 */
export default function PipelinePage(): ReactNode {
  const stytchClient = useStytch();
  const userJWT = useJWT();
  const params = useParams();
  const ctx = useContext(GIContext);
  const pipelineId: string | undefined = params.id;
  const userFromServer = useFetchSelf();
  const pipelineFromServer = useFetchPipeline(pipelineId);
  const pipelineInfoFromServer = useFetchPipelineInfo(pipelineId);
  const pipelineInfo = pipelineInfoFromServer?.value;
  const isAdminView = !!userFromServer?.value?.isAdmin && !!ctx.isAdminMode;
  const maybeRequestError: string | undefined = getError(
    userFromServer,
    pipelineFromServer,
    pipelineInfoFromServer
  );

  useEffect(() => {
    if (!userJWT) {
      window.location.href = "/";
    }
  }, [userJWT]);

  if (maybeRequestError) {
    // TODO: make this nicer
    return (
      <>
        <GlobalPageHeader user={userFromServer} stytchClient={stytchClient} />
        <PageContent>
          <Heading size="md">❌ Load Error</Heading>
          {maybeRequestError}
        </PageContent>
      </>
    );
  }

  if (
    !userFromServer ||
    !pipelineFromServer ||
    !pipelineInfoFromServer ||
    !pipelineInfo
  ) {
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

  const ownedBySomeoneElse =
    pipelineFromServer.value?.ownerUserId !== userFromServer?.value?.id;

  return (
    <>
      <GlobalPageHeader
        user={userFromServer}
        stytchClient={stytchClient}
        titleContent={(): ReactNode => (
          <HStack>
            <span>Pipeline</span>
            <span
              style={{
                fontWeight: "bold"
              }}
            >
              <PipelineDisplayNameText pipeline={pipelineFromServer.value} />{" "}
            </span>
            <Badge>{pipelineFromServer.value?.id}</Badge>
            <div>by {pipelineInfoFromServer.value?.ownerEmail}</div>
          </HStack>
        )}
      />

      {ownedBySomeoneElse && (
        <WarningSection>
          <b>WARNING!</b> You are not the owner of this pipeline, but you can
          see it because you're an <b>admin</b>. Be <b>Careful</b>!
        </WarningSection>
      )}

      <PageContent>
        <TwoColumns>
          <div className="col2">
            {pipelineInfoFromServer.success &&
              pipelineFromServer.success &&
              userFromServer.success && (
                <PipelineEditSection
                  user={userFromServer.value}
                  pipelineInfo={pipelineInfoFromServer.value}
                  pipeline={pipelineFromServer.value}
                  isAdminView={isAdminView}
                />
              )}
          </div>
          <div className="col1">
            {pipelineInfoFromServer.success &&
              pipelineFromServer.success &&
              userFromServer.success && (
                <PipelineDetailSection
                  pipelineInfo={pipelineInfoFromServer.value}
                  pipelineFromServer={pipelineFromServer.value}
                  isAdminView={isAdminView}
                />
              )}
          </div>
        </TwoColumns>
      </PageContent>
    </>
  );
}

const WarningSection = styled.div`
  padding: 16px;
  background-color: rgba(238, 255, 0, 0.1);
`;

const TwoColumns = styled.div`
  max-width: 100%;
  overflow-x: hidden;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  flex-direction: row;
  gap: 32px;

  .col1 {
    flex-grow: 1;
  }

  .col2 {
  }

  ol {
    // to override 'GlobalStyle'
    max-width: unset !important;
  }
`;
