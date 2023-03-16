import { Dispatcher } from "./dispatch";

export function err(dispatch: Dispatcher, title: string, message: string) {
  dispatch({
    type: "error",
    error: { title, message },
  });
}
