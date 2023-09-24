import { Link } from "react-router-dom";
import { PCD_GITHUB_URL } from "../constants";

function Page() {
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
            <Link to="/examples/group-proof">
              Semaphore Group Membership Proof
            </Link>
          </li>
          <li>
            <Link to="/examples/signature-proof">
              Semaphore Signature Proof
            </Link>
          </li>
          <li>
            <Link to="/examples/add-pcd">Add PCDs to the Passport</Link>
          </li>
          <li>
            <Link to="/examples/get-without-proving">Get Without Proving</Link>
          </li>
        </ol>
      </div>
      <div>
        <h2>Zuzalu-Specific Examples [DEPRECATED]</h2>
        <ol>
          <li>
            <Link to="/zuzalu-examples/group-proof">
              [DEPRECATED] Zuzalu Group Membership Proof
            </Link>
          </li>
          <li>
            <Link to="/zuzalu-examples/uuid-proof">
              [DEPRECATED] Zuzalu Identity-Revealing Proof
            </Link>
          </li>
          <li>
            <Link to="/zuzalu-examples/sign-in">
              [DEPRECATED] Zuzalu Sign In
            </Link>
          </li>
          <li>
            <Link to="/zuzalu-examples/signature-proof">
              [DEPRECATED] Semaphore Signature Proof
            </Link>
          </li>
        </ol>
      </div>

      <div>
        <h2>PCDpass Examples</h2>
        <ol>
          <li>
            <Link to="/pcdpass-examples/group-proof">
              PCDpass Group Membership Proof
            </Link>
          </li>
          <li>
            <Link to="/pcdpass-examples/signature-proof">
              Semaphore Signature Proof
            </Link>
          </li>
          <li>
            <Link to="/pcdpass-examples/zk-eddsa-event-ticket-proof">
              ZKEdDSA Event Ticket Proof
            </Link>{" "}
            (supports Event ID list)
          </li>
        </ol>
      </div>
    </div>
  );
}

export default Page;
