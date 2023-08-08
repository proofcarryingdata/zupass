import { DateRange, User, ZuzaluUserRole } from "@pcd/passport-interface";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useSelf } from "../../src/appHooks";
import { getVisitorStatus, VisitorStatus } from "../../src/user";
import { H3, H4, InfoLine, Spacer, TextCenter } from "../core";
import { IdentityQR } from "./IdentityQR";

export function MainIdentityCard({
  showQrCode,
  user
}: {
  showQrCode?: boolean;
  user?: User;
}) {
  const self = useSelf();
  const actualUser = user ?? self;
  const visitorStatus = getVisitorStatus(actualUser);

  return (
    <CardBody>
      {showQrCode &&
        !(
          visitorStatus.isVisitor &&
          visitorStatus.status !== VisitorStatus.Current
        ) && (
          <>
            <Spacer h={32} />
            <IdentityQR />
          </>
        )}
      <Spacer h={24} />
      <TextCenter>
        <H3 col="var(--primary-dark)">{actualUser.name}</H3>
        {appConfig.isZuzalu && <InfoLine>{actualUser.email}</InfoLine>}
        {!appConfig.isZuzalu && (
          <H4 col="var(--bg-dark-primary)">{actualUser.email}</H4>
        )}
        <VisitorDateSection user={actualUser} />
      </TextCenter>
      <Spacer h={24} />
      {appConfig.isZuzalu && (
        <Footer
          role={actualUser.role}
          notCurrent={
            visitorStatus &&
            visitorStatus.isVisitor &&
            visitorStatus.status !== VisitorStatus.Current
          }
        >
          ZUZALU {actualUser.role.toUpperCase()}
        </Footer>
      )}
    </CardBody>
  );
}

function VisitorDateSection({ user }: { user?: User }) {
  if (!user) return null;
  if (user.role !== ZuzaluUserRole.Visitor) return null;
  if (!user.visitor_date_ranges) return null;

  return (
    <>
      <InfoLine>
        <b>Visitor Dates:</b>
      </InfoLine>
      {user.visitor_date_ranges.map((range, i) => (
        <InfoLine key={i}>
          <DateRangeText range={range} />
        </InfoLine>
      ))}
    </>
  );
}

function DateRangeText({ range }: { range: DateRange }) {
  return (
    <span>
      {new Date(range.date_from).toDateString()} -{" "}
      {new Date(range.date_to).toDateString()}
    </span>
  );
}

const CardBody = styled.div`
  background: var(--white);
  color: var(--primary-dark);
  border-radius: 0 0 12px 12px;
`;

const Footer = styled.div<{ role: string; notCurrent: boolean }>`
  font-size: 20px;
  letter-spacing: 1px;
  background: ${(p) => {
    if (p.notCurrent) {
      return "var(--danger)";
    }

    return highlight(p.role) ? "var(--accent-lite)" : "var(--primary-dark)";
  }};
  color: ${(p) => (highlight(p.role) ? "var(--primary-dark)" : "var(--white)")};
  /* Must be slightly lower than the card's border-radius to nest correctly. */
  border-radius: 0 0 10px 10px;
  padding: 8px;
  text-align: center;
`;

function highlight(role: string) {
  return role === "resident" || role === "organizer";
}
