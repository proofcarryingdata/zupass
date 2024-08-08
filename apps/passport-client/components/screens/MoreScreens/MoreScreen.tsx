import { Spacer } from "@pcd/passport-ui";
import { ReactNode } from "react";
import { cn } from "../../../src/util";
import { NewButton } from "../../NewButton";
import { Placeholder } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { ZupassTitle } from "../HomeScreen/HomeScreen";

interface SubPage {
  image: string;
  pageLink?: string;
  title: string;
}

export const subPages: SubPage[] = [
  {
    image: "https://i.imgur.com/8uWVBl6.png",
    title: "Duck",
    pageLink: "#/duck"
  },
  {
    image: "https://i.imgur.com/dPHJPtO.png",
    title: "FHE",
    pageLink: "#/fhe"
  },
  {
    image: "https://i.imgur.com/W9LVI5D.png",
    title: "POD",
    pageLink: "#/pod"
  },
  {
    image: "https://i.imgur.com/1fr57wQ.png",
    title: "ZK",
    pageLink: "#/zk"
  },
  {
    image: "https://i.imgur.com/5wnnlmb.png",
    title: "0xPARC",
    pageLink: "#/0xparc"
  },
  {
    image: "https://i.imgur.com/jrsV7Vr.png",
    title: "Zupass",
    pageLink: "https://github.com/proofcarryingdata/zupass"
  }
];

export function MoreScreen(): ReactNode {
  // useEffect(() => {
  //   // Set CSS variables on the html element to change into dark mode.
  //   const rootStyle = document.documentElement.style;
  //   rootStyle.setProperty("--bg-dark-primary", "#38891d");
  //   rootStyle.setProperty("--bg-lite-primary", "#38891d");
  //   rootStyle.setProperty("--primary-dark", "#38891d");
  //   rootStyle.setProperty("--accent-dark", "white");
  //   rootStyle.setProperty("--accent-lite", "white");

  //   return () => {
  //     rootStyle.removeProperty("--bg-dark-primary");
  //     rootStyle.removeProperty("--bg-lite-primary");
  //     rootStyle.removeProperty("--primary-dark");
  //     rootStyle.removeProperty("--accent-dark");
  //     rootStyle.removeProperty("--accent-lite");
  //     rootStyle.removeProperty("background");
  //   };
  // }, []);

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <div className="flex-row flex align-center items-center gap-3">
          <ZupassTitle>Zupass</ZupassTitle>
        </div>
        <Placeholder minH={540}>
          <NewButton
            className="w-full"
            onClick={() => {
              window.location.href = "#/";
            }}
          >
            Back
          </NewButton>

          <div className="grid grid-cols-2 gap-4 mt-[0.75rem] w-full">
            {subPages.map((page, i) => (
              <NewButton
                key={i}
                className={squareStyle}
                onClick={() => {
                  if (page.pageLink) {
                    window.location.href = page.pageLink;
                  }
                }}
              >
                {page.title}
              </NewButton>
            ))}
          </div>
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}

const squareStyle = cn();
