import { Spinner } from "@chakra-ui/react";
import { getError } from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { PageContent } from "../components/Core";
import { Header } from "../components/Header";
import { GIContext } from "../helpers/Context";
import { useFetchPipeline } from "../helpers/useFetchPipeline";
import { useFetchPipelineInfo } from "../helpers/useFetchPipelineInfo";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";
import { PipelineDetailView } from "../sections/PipelineDetailView";
import { PipelineEditView } from "../sections/PipelineEditView";

export default function Pipeline(): ReactNode {
  const stytchClient = useStytch();
  const userJWT = useJWT();
  const params = useParams();
  const ctx = useContext(GIContext);
  const pipelineId: string | undefined = params.id;
  const userFromServer = useFetchSelf();
  const pipelineFromServer = useFetchPipeline(pipelineId);
  const pipelineInfoFromServer = useFetchPipelineInfo(pipelineId);
  const pipelineInfo = pipelineInfoFromServer?.value;

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
    return (
      <>
        <Header
          includeLinkToDashboard
          user={userFromServer}
          stytchClient={stytchClient}
        />
        <PageContent>
          <h2>❌ Load Error</h2>
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
        <Header
          includeLinkToDashboard
          user={userFromServer}
          stytchClient={stytchClient}
        />
        <PageContent>
          <Spinner />
        </PageContent>
      </>
    );
  }

  const ownedBySomeoneElse =
    pipelineFromServer.value?.ownerUserId !== userFromServer?.value?.id;

  return (
    <>
      <Header
        includeLinkToDashboard
        user={userFromServer}
        stytchClient={stytchClient}
      />
      {ownedBySomeoneElse && (
        <WarningSection>
          <b>WARNING!</b> You are not the owner of this pipeline, but you can
          see it because you're an <b>admin</b>. Be <b>Careful</b>!
        </WarningSection>
      )}

      <PageContent>
        <TwoColumns>
          <div>
            {pipelineInfoFromServer.success &&
              pipelineFromServer.success &&
              userFromServer.success && (
                <PipelineEditView
                  user={userFromServer.value}
                  pipeline={pipelineFromServer.value}
                  isAdminView={false}
                />
              )}
          </div>
          <div style={{ flexGrow: 1 }}>
            {pipelineInfoFromServer.success &&
              pipelineFromServer.success &&
              userFromServer.success && (
                <PipelineDetailView
                  pipelineInfo={pipelineInfoFromServer.value}
                  pipelineFromServer={pipelineFromServer.value}
                  isAdminView={
                    !!userFromServer.value?.isAdmin && !!ctx.isAdminMode
                  }
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
  display: flex;
  justify-content: stretch;
  align-items: stretch;
  flex-direction: row;
  gap: 32px;

  ol {
    // to override 'GlobalStyle'
    max-width: unset !important;
  }
`;
