import { Heading, Spinner } from "@chakra-ui/react";
import { getError } from "@pcd/passport-interface";
import { ReactNode, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { PageContent } from "../../components/Core";
import { LoadingContent } from "../../components/LoadingContent";
import { GlobalPageHeader } from "../../components/header/GlobalPageHeader";
import { useFetchPipeline } from "../../helpers/useFetchPipeline";
import { useFetchPipelineInfo } from "../../helpers/useFetchPipelineInfo";
import { useFetchSelf } from "../../helpers/useFetchSelf";
import { useIsAdminView } from "../../helpers/useIsAdminView";
import { useJWT } from "../../helpers/userHooks";
import { PipelineDetailSection } from "./PipelineDetailSection";
import { PipelineEditSection } from "./PipelineEditSection/PipelineEditSection";

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
    <Container>
      <HeaderContainer>
        <GlobalPageHeader user={user} titleContent={(): ReactNode => null} />

        {ownedBySomeoneElse && (
          <WarningSection>
            <b>WARNING!</b> You are not the owner of this pipeline, but you can
            see it because you're an <b>admin</b>. Be <b>Careful</b>!
          </WarningSection>
        )}
      </HeaderContainer>

      <TwoColumns>
        <div className="col editor-col">
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
        <div className="col details-col">
          {pipelineInfoResult && pipelineDefinition.success && user.success && (
            <PipelineDetailSection
              pipelineInfo={pipelineInfo}
              pipeline={pipelineDefinition.value}
              isAdminView={isAdminView}
            />
          )}
        </div>
      </TwoColumns>
    </Container>
  );
}

const WarningSection = styled.div`
  padding: 16px;
  background-color: rgba(238, 255, 0, 0.1);
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  flex-direction: column;
`;

const HeaderContainer = styled.div``;

export const TwoColumns = styled.div`
  margin: 32px;
  margin-bottom: 0;
  margin-right: 0;
  box-sizing: border-box;
  max-width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  flex-direction: row;
  gap: 32px;

  .col {
    /* height: 100%; */
  }

  .editor-col {
    height: 100%;
    max-height: 100%;
    overflow: hidden;
    padding-bottom: 32px;
  }

  .details-col {
    flex-grow: 1;
    overflow-y: scroll;
    flex-basis: 500px;
    padding-bottom: 128px;
  }

  ol {
    // to override 'GlobalStyle'
    max-width: unset !important;
  }
`;
