import {
  CardContainerExpanded,
  CardHeader,
  CardOutlineExpanded
} from "../PCDCard";

export function ZuzaluKnownTicketDetails({
  publicKeyName
}: {
  publicKeyName: string;
}) {
  return (
    <CardContainerExpanded>
      <CardOutlineExpanded>
        <CardHeader col="var(--accent-lite)">
          <div>VERIFIED ZUZALU '23 TICKET</div>
          <div>SIGNED BY: {publicKeyName}</div>
        </CardHeader>
      </CardOutlineExpanded>
    </CardContainerExpanded>
  );
}
