import VoteDialog from "@/components/ui/VoteDialog";

export function BallotOptionModal({
  close,
  onVoted
}: {
  close: () => void;
  onVoted: () => void;
}) {
  return <VoteDialog close={close} onVoted={onVoted}></VoteDialog>;
}
