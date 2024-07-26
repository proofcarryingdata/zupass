import { User } from "@pcd/passport-interface";
import { QRDisplay } from "@pcd/passport-ui";
import styled from "styled-components";
import { useSelf } from "../../src/appHooks";

export function MainIdentityCard({ user }: { user?: User }): JSX.Element {
  const self = useSelf();
  const actualUser = user ?? self;

  return (
    <CardBody>
      <QRDisplay saved={false} value={actualUser?.commitment}></QRDisplay>
    </CardBody>
  );
}

const CardBody = styled.div`
  color: var(--primary-dark);
  background: var(--primary-darker);
  background: white;
`;
