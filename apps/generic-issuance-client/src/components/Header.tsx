import { useStytch } from "@stytch/react";
import { ReactNode } from "react";
import { useFetchSelf } from "../helpers/useFetchSelf";

export function Header(): ReactNode {
  const stytchClient = useStytch();
  const self = useFetchSelf();
  const user = self?.value;

  const headerElements: ReactNode[] = [];

  headerElements.push(<b key="title">Generic Issuance</b>);

  if (user) {
    headerElements.push(
      <b key="email">
        {" · "}
        {user.email}
      </b>
    );
  }

  if (user?.isAdmin) {
    headerElements.push(
      <b key="admin">
        {" · "}
        {"admin"}
      </b>
    );
  }

  if (user) {
    headerElements.push(
      <span key="logout">
        {" · "}
        <button
          onClick={async (): Promise<void> => {
            if (confirm("Are you sure you want to log out?")) {
              try {
                await stytchClient.session.revoke();
              } catch (e) {
                // TODO: better error handling
              }
            }
          }}
        >
          Log Out
        </button>
      </span>
    );
  }

  return <>{headerElements}</>;
}
