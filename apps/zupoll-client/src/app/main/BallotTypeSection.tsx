import { Title } from "@/components/ui/text";
import { BallotType, LoginConfig } from "@pcd/zupoll-shared";
import { useMemo } from "react";
import { Ballot } from "../../api/prismaTypes";
import { LoginState } from "../../types";
import { BallotList } from "./BallotList";

export interface BallotTypeSectionProps {
  title?: string;
  description?: string;
  ballots: Ballot[];
  filter: (b: Ballot) => boolean;
  visible?: boolean;
  loading: boolean;
}

export function BallotTypeSection({
  title,
  description,
  ballots,
  filter,
  visible,
  loading
}: BallotTypeSectionProps) {
  const filtered = useMemo(() => {
    return ballots.filter(filter);
  }, [ballots, filter]);

  if (visible === false) {
    return null;
  }

  return (
    <div className="mb-4">
      {title && <Title>{title}</Title>}
      {description && <p className="text-sm">{description}</p>}
      <BallotList loading={loading} ballots={filtered} />
    </div>
  );
}

export function BallotsForUserSection({
  loginConfig,
  loading,
  ballots,
  loginState
}: {
  loginConfig: LoginConfig;
  loginState: LoginState;
  loading: boolean;
  ballots: Ballot[];
}) {
  return (
    <>
      {loginConfig.ballotConfigs?.map((c) => {
        return (
          <BallotTypeSection
            key={loginConfig.name + c.name}
            visible={loginState.config.name === loginConfig.name}
            title={c.name}
            loading={loading}
            description={loginConfig.description}
            ballots={ballots}
            filter={(b) => b.ballotType === BallotType.PODBOX}
          />
        );
      })}
    </>
  );
}
