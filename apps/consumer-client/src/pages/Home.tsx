import { Link } from "react-router-dom";
import { PCD_GITHUB_URL } from "../constants";

function Page(): JSX.Element {
  return (
    <div>
      <h1>Example Zupass Integrations</h1>
      <p>
        This website contains many working examples third party applications
        integrating with Zupass via the <a href={PCD_GITHUB_URL}>PCD SDK</a>.
      </p>
      <div>
        <ol>
          <li>
            <Link to="/examples/group-proof">
              Prove and Get a Semaphore Group Membership Proof from Zupass
            </Link>
          </li>
          <li>
            <Link to="/examples/signature-proof">
              Prove and Get a Semaphore Signature Proof from Zupass
            </Link>
          </li>
          <li>
            <Link to="/examples/add-pcd">Add PCDs to Zupass</Link>
          </li>
          <li>
            <Link to="/examples/get-without-proving">
              Get a PCD from Zupass Without Proving from Zupass
            </Link>
          </li>
          <li>
            <Link to="/examples/zk-eddsa-event-ticket-proof">
              Prove and Get a ZKEdDSA Event Ticket Proof from Zupass
            </Link>
          </li>
          <li>
            <Link to="/examples/zuauth">ZuAuth authentication of tickets</Link>
          </li>
          <li>
            <Link to="/examples/zk-eddsa-frog-proof">
              Prove and Get a ZKEdDSA Frog Proof from Zupass
            </Link>
          </li>
          <li>
            <Link to="/examples/gpc-proof">
              Prove and Get a GPC Proof of PODs from Zupass
            </Link>
          </li>
        </ol>
      </div>
    </div>
  );
}

export default Page;
