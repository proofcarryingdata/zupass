import {
  DependencyList,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { StateContext } from "./dispatch";
import { AppState } from "./state";

export type Selector<T> = (state: AppState) => T;

export function useOnStateChange(
  h: (state: AppState) => unknown,
  deps?: DependencyList
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handler = useCallback(h, deps ?? []);
  const context = useContext(StateContext);

  useEffect(() => {
    return context.stateEmitter.listen(handler);
  }, [context.stateEmitter, handler]);
}

export function useSelector<T>(
  selector: Selector<T>,
  deps?: DependencyList
): T {
  const context = useContext(StateContext);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectorFunc = useCallback(selector, deps ?? []);
  const [selected, setSelected] = useState(() =>
    selectorFunc(context.getState())
  );
  const selectedRef = useRef(selected);

  const onStateChange = useCallback(
    (s: AppState) => {
      const newSelected = selectorFunc(s);
      if (newSelected !== selectedRef.current) {
        selectedRef.current = newSelected;
        setSelected(newSelected);
      }
    },
    [selectorFunc]
  );

  useOnStateChange(onStateChange);

  return selected;
}
