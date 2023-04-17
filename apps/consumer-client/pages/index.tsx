import { PCD_GITHUB_URL } from "../src/constants";

/**
 * Landing page of the example 'consumer client' application, which is a
 * directory of examples for how to use the PCD SDK and integrate with
 * the passport.
 */
export default function Page() {
  return (
    <div>
      <h1>PCD Example Directory</h1>
      <p>
        This website contains many working examples third party applications
        integrating with the <a href={PCD_GITHUB_URL}>PCD SDK</a>. We included
        two sections: those integrations that are specifically enabled for
        Zuzalu, and those that can and should be used on other websites.
      </p>
      <div>
        <h2>Generic Examples</h2>
        <ol>
          <li>
            <a href="/examples/group-proof">Semaphore Group Membership Proof</a>
          </li>
          <li>
            <a href="/examples/signature-proof">Semaphore Signature Proof</a>
          </li>
          <li>
            <a href="/examples/add-pcd">Add add PCDs to the Passport</a>
          </li>
          <li>
            <a href="/examples/get-without-proving">Get Without Proving</a>
          </li>
        </ol>
      </div>
      <div>
        <h2>Zuzalu-Specific Examples</h2>
        <ol>
          <li>
            <a href="/zuzalu-examples/group-proof">
              Zuzalu Group Membership Proof
            </a>
          </li>
          <li>
            <a href="/zuzalu-examples/uuid-proof">
              Zuzalu Identity-Revealing Proof
            </a>
          </li>
          <li>
            <a href="/zuzalu-examples/signature-proof">
              Semaphore Signature Proof
            </a>
          </li>
        </ol>
      </div>
    </div>
  );
}
