/* eslint-disable @typescript-eslint/explicit-function-return-type */
import ora from "ora";

export default class Spinner {
  text;
  ora;

  constructor(text) {
    this.text = text;
  }

  start() {
    this.ora = ora({
      text: this.text,
      indent: 1
    }).start();
  }

  stop() {
    this.ora.stop();
  }
}
