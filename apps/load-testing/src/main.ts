import { runLoadTest } from "./load-test";

runLoadTest()
  .then(() => {
    console.log("finished starting load test");
  })
  .catch((e) => {
    console.log("error running load test");
    console.log(e);
  });
