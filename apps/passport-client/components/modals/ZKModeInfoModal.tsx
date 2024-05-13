import { Spacer } from "@pcd/passport-ui";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { saveSeenZKModeInfo } from "../../src/localstorage";
import { Button, H2 } from "../core";

/**
 * A Zupass client can sometimes end up with invalid local state. When that happens,
 * we generally set {@link AppState.userInvalid} to true, and display this modal by
 * setting {@link AppState.modal} to `{ modalType: "invalid-participant" }`. This modal
 * explains what's going on + suggest paths to resolve the problem.
 */
export function ZKModeInfoModal(): JSX.Element {
  const dispatch = useDispatch();

  const onClose = (): void => {
    saveSeenZKModeInfo(true);
    dispatch({
      type: "set-modal",
      modal: {
        modalType: "none"
      }
    });
  };

  return (
    <Container>
      <H2>ZK Mode</H2>
      <Spacer h={24} />
      <p>
        Note that some ticket information is shared with Pretix. Please come to
        the info desk to learn more.
      </p>

      <Spacer h={16} />
      <Button onClick={onClose}>Done</Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
  p {
    margin-bottom: 8px;
  }
  ul {
    list-style: circle;
    margin-bottom: 8px;
    li {
      margin-left: 32px;
    }
  }
`;
