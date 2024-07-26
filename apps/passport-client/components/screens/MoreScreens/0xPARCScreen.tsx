import { Spacer } from "@pcd/passport-ui";
import { ReactNode, useState } from "react";
import { NewButton } from "../../NewButton";
import { H1, Placeholder, ZuLogo } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

const Notes = [
  { title: "Zero Knowledge Proofs", url: "https://0xparc.org/notes/zkp" }
];

const BlogPosts = [
  {
    title: "ZK Hunt: an exploration into the unknown",
    url: "https://0xparc.org/blog/zk-hunt"
  },
  {
    title: "Introducing the Autonomous Worlds Network",
    url: "https://0xparc.org/blog/autonomous-worlds-network"
  },
  {
    title: "[Community] Announcing Index Supply",
    url: "https://github.com/orgs/indexsupply/discussions/125"
  },
  {
    title: "Autonomous Worlds Hackathon",
    url: "https://0xparc.org/blog/autonomous-worlds-hackathon"
  },
  {
    title: "Apply for the ZK Spring Residency in Vietnam",
    url: "https://0xparc.org/blog/2023-spring-residency"
  },
  {
    title:
      "Apply for PARC Squad: Proof Aggregation, Recursion, and Composition",
    url: "https://0xparc.org/blog/parc-squad"
  },
  {
    title: "Recursive zkSNARKs: Exploring New Territory",
    url: "https://0xparc.org/blog/groth16-recursion"
  },
  {
    title: "[Community] Announcing Succinct Labs",
    url: "https://blog.succinct.xyz/post/2022/09/20/proof-of-consensus/"
  },
  {
    title: "[Community] Announcing Personae Labs",
    url: "https://personae-labs.notion.site/Personae-Labs-d46a90c64953416eb386a0ae2ee7679b"
  },
  {
    title: "[Community] ETHdos",
    url: "https://ethdos.xyz/blog"
  }
];

export function ParcScreen(): ReactNode {
  const [isBlog, setIsBlog] = useState(true);

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3">
          <ZuLogo width="48px" /> <H1 className="">Zupass</H1>
        </div>
        <Spacer h={24} />
        <Placeholder minH={540}>
          <div className="flex flex-col gap-2">
            <NewButton
              onClick={() => {
                window.location.href = "#/more";
              }}
            >
              Back
            </NewButton>
            <div className="flex flex-row gap-2">
              <NewButton className="flex-grow" onClick={() => setIsBlog(true)}>
                Blog
              </NewButton>
              <NewButton className="flex-grow" onClick={() => setIsBlog(false)}>
                Notes
              </NewButton>
            </div>
            {(isBlog ? BlogPosts : Notes).map((post, i) => (
              <NewButton
                variant="blackWhite"
                className="overflow-hidden text-ellipsis whitespace-nowrap"
                key={i}
                onClick={() => window.open(post.url, "_blank")}
              >
                {post.title}
              </NewButton>
            ))}
          </div>
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}
