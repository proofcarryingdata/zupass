import { Identity } from "@semaphore-protocol/identity";
import { requestLoginCode } from "./api/user";

async function testSingleUser() {
  const email = 'ivan@0xparc.org';
  const identity = new Identity();
  

  const code: string | undefined = await requestLoginCode(email, identity.commitment.toString(), true);
  console.log(`got code ${code}`);
}

async function runLoadTest() {
  await testSingleUser();
}

runLoadTest().then(() => {
  console.log("finished running load test")
}).catch(e => {
  console.log("error running load test");
  console.log(e);
});