import zxcvbn from "zxcvbn";

declare global {
  interface Window {
    zxcvbn?: typeof zxcvbn;
  }
}
