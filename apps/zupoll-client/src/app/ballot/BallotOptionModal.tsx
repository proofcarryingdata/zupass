import { Dialog } from "@/components/ui/Dialog";

export function BallotOptionModal({ close }: { close: () => void }) {
  return (
    <div
      onClick={close}
      className="absolute top-0 left-0 w-full h-full bg-black/50 m-auto z-50 bg-red-90"
    >
      <Dialog>test</Dialog>
    </div>
  );
}
