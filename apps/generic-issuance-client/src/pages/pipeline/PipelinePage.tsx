import { Badge, HStack, Heading, Spinner } from "@chakra-ui/react";
import { getError } from "@pcd/passport-interface";
import { ReactNode, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { PageContent } from "../../components/Core";
import { LoadingContent } from "../../components/LoadingContent";
import { PipelineDisplayNameText } from "../../components/PipelineDisplayUtils";
import { GlobalPageHeader } from "../../components/header/GlobalPageHeader";
import { useFetchPipeline } from "../../helpers/useFetchPipeline";
import { useFetchPipelineInfo } from "../../helpers/useFetchPipelineInfo";
import { useFetchSelf } from "../../helpers/useFetchSelf";
import { useIsAdminView } from "../../helpers/useIsAdminView";
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
  const userJWT = useJWT();
  const params = useParams();
  const pipelineId: string | undefined = params.id;
  const user = useFetchSelf();
  const pipelineDefinition = useFetchPipeline(pipelineId);
  const pipelineInfoResult = useFetchPipelineInfo(pipelineId);
  const pipelineInfo = pipelineInfoResult?.value;
  const isAdminView = useIsAdminView(user?.value);

  const maybeRequestError: string | undefined = getError(
    user,
    pipelineDefinition,
    pipelineInfoResult
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
        <GlobalPageHeader user={user} />
        <PageContent>
          <Heading size="md">❌ Load Error</Heading>
          {maybeRequestError}
        </PageContent>
      </>
    );
  }

  if (!user || !pipelineDefinition || !pipelineInfo || !pipelineInfo) {
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

  const ownedBySomeoneElse =
    pipelineDefinition.value?.ownerUserId !== user?.value?.id;

  return (
    <>
      <GlobalPageHeader
        user={user}
        titleContent={(): ReactNode => (
          <HStack>
            <span>Pipeline</span>
            <span
              style={{
                fontWeight: "bold"
              }}
            >
              <PipelineDisplayNameText pipeline={pipelineDefinition.value} />{" "}
            </span>
            <Badge>{pipelineDefinition.value?.id}</Badge>
            <div>by {pipelineInfo?.ownerEmail}</div>
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
            {pipelineInfoResult.success &&
              pipelineDefinition.success &&
              user.success && (
                <PipelineEditSection
                  user={user.value}
                  pipelineInfo={pipelineInfo}
                  pipeline={pipelineDefinition.value}
                  isAdminView={isAdminView}
                />
              )}
          </div>
          <div className="col1">
            {pipelineInfoResult &&
              pipelineDefinition.success &&
              user.success && (
                <PipelineDetailSection
                  pipelineInfo={pipelineInfo}
                  pipelineFromServer={pipelineDefinition.value}
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

export const TwoColumns = styled.div`
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
