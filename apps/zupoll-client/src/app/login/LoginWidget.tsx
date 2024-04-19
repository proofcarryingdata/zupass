import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { LoginCategory, LoginConfig } from "@pcd/zupoll-shared";
import _ from "lodash";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { LOGIN_GROUPS } from "../../api/loginGroups";
import { LoginState, ZupollError } from "../../types";
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
      <LoginWidgetContentContainer className="flex flex-row gap-2 justify-between grow">
        {selectedGroup && (
          <div className="min-w-52 grow">
            <LoginActionsForLoginGroup {...props} group={selectedGroup} />
          </div>
        )}

        <div
          className={cn(
            selectedGroup === undefined
              ? "w-full"
              : "shrink-0 w-[45%] min-w-[45%]"
          )}
        >
          <SelectLoginGroup
            selectedGroup={selectedGroupId}
            setSelectedGroup={setCurGroupCategory}
            groups={LOGIN_GROUPS}
          />
        </div>
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
      <div className="text-sm text-foreground/90">Tip: {randomTip}</div>
    </div>
  );
}

/**
 * Props for {@link LoginWidget}.
 */
export interface LoginWidgetProps {
  configs: LoginConfig[];
  onLogin: (loginState: LoginState) => void;
  loggingIn: boolean;
  setError: (error?: ZupollError) => void;
  setServerLoading: (loading: boolean) => void;
  serverLoading: boolean;
}

const LoginWidgetContentContainer = styled.div`
  /**
   * mobile styling
   */
  @media screen and (max-width: 640px) {
    flex-direction: column;
  }
`;
