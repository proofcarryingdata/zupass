import { ZUPASS_GITHUB_REPOSITORY_URL } from "@pcd/util";
import { CenterColumn, Spacer, TextCenter } from "../core";
import { icons } from "../icons";

export function InfoModal() {
  return (
    <div>
      <Spacer h={32} />
      <TextCenter>
        <a target="_blank" href={ZUPASS_GITHUB_REPOSITORY_URL}>
          <img draggable="false" src={icons.github} width={34} height={34} />
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
