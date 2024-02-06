import { ReactNode } from "react";
import { useFetchSelf } from "../helpers/useFetchSelf";

export function Header(): ReactNode {
  const self = useFetchSelf();

  return <b>this is the header</b>;
}
