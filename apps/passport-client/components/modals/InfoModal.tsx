import { ZUPASS_GITHUB_REPOSITORY_URL } from "@pcd/util";
import { FaGithub } from "react-icons/fa";
import { CenterColumn, Spacer, SupportLink, TextCenter } from "../core";

export function InfoModal(): JSX.Element {
  return (
    <div>
      <TextCenter>
        <a target="_blank" href={ZUPASS_GITHUB_REPOSITORY_URL}>
          <FaGithub style={{ width: "34px", height: "34px", fill: "#fff" }} />
        </a>
      </TextCenter>
      <Spacer h={24} />
      <CenterColumn w={240}>
        <>
          <TextCenter>
            Zupass is an open source, experimental personal cryptography
            manager.
          </TextCenter>
          <Spacer h={16} />
          <TextCenter>
            For app support, contact <SupportLink />.
          </TextCenter>
        </>
      </CenterColumn>
    </div>
  );
}
