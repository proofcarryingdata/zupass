import { Spinner } from "@/components/ui/spinner";
import { LoginCategory } from "@pcd/zupoll-shared";
import _ from "lodash";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { LOGIN_GROUPS } from "../../api/loginGroups";
import { LoginActionsForLoginGroup } from "./LoginActionsForLoginGroup";
import { SelectLoginGroup } from "./SelectLoginGroup";

/**
 * Lets user select event and then log in as one of the groups in
 * that event.
 */
export function LoginWidget(props: LoginWidgetProps) {
  const [selectedGroupId, setCurGroupCategory] = useState<
    LoginCategory | undefined
  >();
  const selectedGroup = useMemo(() => {
    return LOGIN_GROUPS.find((g) => g.category === selectedGroupId);
  }, [selectedGroupId]);

  if (props.loggingIn) {
    return <LoggingIn />;
  }

  return (
    <>
      <LoginWidgetContentContainer className="flex flex-col gap-2 items-stretch justify-center grow">
        <div className={"w-full"}>
          <SelectLoginGroup
            selectedGroup={selectedGroupId}
            setSelectedGroup={setCurGroupCategory}
            groups={LOGIN_GROUPS}
            loading={props.serverLoading}
          />
        </div>

        {selectedGroup && (
          <div className="min-w-52 grow">
            <LoginActionsForLoginGroup {...props} group={selectedGroup} />
          </div>
        )}
      </LoginWidgetContentContainer>
    </>
  );
}

const tips = [
  "Zupoll lets you vote on ballots anonymously",
  "Your votes are un-linkable across ballots."
];

export function LoggingIn() {
  const randomTip = useMemo(() => {
    return _.sample(tips);
  }, []);

  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full min-h-12">
      Logging In
      <Spinner className="w-8 h-8" />
      <div className="text-sm text-foreground/90 w-full flex items-center justify-center">
        Tip: {randomTip}
      </div>
    </div>
  );
}

/**
 * Props for {@link LoginWidget}.
 */
export interface LoginWidgetProps {
  loggingIn: boolean;
  setServerLoading: (loading: boolean) => void;
  serverLoading: boolean;
}

const LoginWidgetContentContainer = styled.div`
  /**
   * mobile styling
   */
  @media screen and (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;

    div {
      width: 100%;
    }
  }
`;
