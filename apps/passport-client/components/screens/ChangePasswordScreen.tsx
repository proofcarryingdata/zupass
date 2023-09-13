import { useSelf } from "../../src/appHooks";

export function ChangePasswordScreen() {
  const self = useSelf();
  return <div>{JSON.stringify(self)}</div>;
}
