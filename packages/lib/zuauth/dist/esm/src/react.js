import { useEffect, useState } from "react";
import { zuAuthPopup } from "./index";
/**
 * Simple React effect hook for using ZuAuth for authentication.
 */
export function useZuAuthPopup(args) {
    const [result, setResult] = useState({ type: "loading" });
    useEffect(() => {
        zuAuthPopup(args).then(setResult);
    }, [args]);
    return result;
}
