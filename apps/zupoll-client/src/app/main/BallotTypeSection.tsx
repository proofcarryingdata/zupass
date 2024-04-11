import { Title } from "@/components/ui/text";
import { useMemo } from "react";
import { Ballot } from "../../api/prismaTypes";
import { BallotList } from "./BallotList";

export interface BallotTypeSectionProps {
  title: string;
  description?: string;
  ballots: Ballot[];
  filter: (b: Ballot) => boolean;
  visible?: boolean;
}

export function BallotTypeSection({
  title,
  description,
  ballots,
  filter,
  visible
}: BallotTypeSectionProps) {
  const filtered = useMemo(() => {
    return ballots.filter(filter);
  }, [ballots, filter]);

  if (visible === false) {
    return null;
  }

  return (
    <div className="mb-4">
      <Title>{title}</Title>
      {description && <p>{description}</p>}
      <BallotList ballots={filtered} />
    </div>
  );
}
