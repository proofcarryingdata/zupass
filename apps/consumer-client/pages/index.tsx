import { PCD_GITHUB_URL } from "../src/constants";

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
          <li>Semaphore Group Membership Proof (coming soon)</li>
          <li>Semaphore Signature Proof (coming soon) </li>
        </ol>
      </div>
      <div>
        <h2>Zuzalu-Specific Examples</h2>
        <ol>
          <li>
            <a href="/zuzalu-examples/group-proof">
              Semaphore Group Membership Proof
            </a>
          </li>
          <li>
            <a href="/zuzalu-examples/signature-proof">
              Semaphore Signature Proof
            </a>
          </li>
          <li>
            <a href="/zuzalu-examples/uuid-proof">
              Semaphore Identity-Revealing Proof
            </a>
          </li>
        </ol>
      </div>
    </div>
  );
}
