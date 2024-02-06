import { ReactNode } from "react";
import { useFetchSelf } from "../helpers/useFetchSelf";

export function Header(): ReactNode {
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

  return <>{headerElements}</>;
}
