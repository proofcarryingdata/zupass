"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useZuAuthPopup = void 0;
const react_1 = require("react");
const index_1 = require("./index");
/**
 * Simple React effect hook for using ZuAuth for authentication.
 */
function useZuAuthPopup(args) {
    const [result, setResult] = (0, react_1.useState)({ type: "loading" });
    (0, react_1.useEffect)(() => {
        (0, index_1.zuAuthPopup)(args).then(setResult);
    }, [args]);
    return result;
}
exports.useZuAuthPopup = useZuAuthPopup;
