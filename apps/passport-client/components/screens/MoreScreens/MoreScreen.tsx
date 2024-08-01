import { Spacer } from "@pcd/passport-ui";
import { ReactNode, useState } from "react";
import { cn } from "../../../src/util";
import { NewButton } from "../../NewButton";
import { H1, Placeholder, ZuLogo } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

interface SubPage {
  image: string;
  pageLink?: string;
  title: string;
}

export const subPages: SubPage[] = [
  {
    image: "https://i.imgur.com/placeholder1.png",
    title: "Zupoll",
    pageLink: "https://zupoll.org/"
  },
  {
    image: "https://i.imgur.com/placeholder2.png",
    title: "ZuKat",
    pageLink: "https://t.me/zucat_bot?start=-1002035758802"
  },
  {
    image: "https://i.imgur.com/placeholder3.png",
    title: "Meerkat",
    pageLink: ""
  },
  {
    image: "https://i.imgur.com/placeholder3.png",
    title: "ZK Social Graph",
    pageLink: ""
  },
  {
    image: "https://i.imgur.com/placeholder3.png",
    title: "Backpocket",
    pageLink: "https://zksummit.cursive.team/"
  },
  {
    image: "https://i.imgur.com/8uWVBl6.png",
    title: "Duck Stuff",
    pageLink: "https://random-d.uk/"
  }
];

export function MoreScreen(): ReactNode {
  const [selectedPage, setSelectedPage] = useState<string | undefined>();

  const handleButtonClick = (
    pageLink: string | undefined,
    title: string
  ): void => {
    if (
      pageLink === "https://t.me/zucat_bot?start=-1002035758802" ||
      title === "ZuKat"
    ) {
      window.open(pageLink, "_blank");
    } else {
      setSelectedPage(pageLink);
    }
  };

  const handleBackClick = (): void => {
    setSelectedPage(undefined);
  };

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
          <NewButton
            onClick={
              selectedPage
                ? handleBackClick
                : (): void => {
                    window.location.href = "#/";
                  }
            }
          >
            Back
          </NewButton>

          {!selectedPage ? (
            <div className="grid grid-cols-2 gap-4 mt-[0.75rem] w-full">
              {subPages.map((page, i) => (
                <NewButton
                  key={i}
                  className={squareStyle}
                  onClick={() => handleButtonClick(page.pageLink, page.title)}
                >
                  {page.title}
                </NewButton>
              ))}
            </div>
          ) : (
            <div className="mt-4 w-full h-[calc(100vh-150px)]">
              <iframe
                src={selectedPage}
                className="w-full h-full border-0"
                title="Selected Page Content"
              />
            </div>
          )}
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}

const squareStyle = cn();
// "rounded-lg",
// "font-bold text-xl active:scale-[1.05] hover:translate-y-[-3px] active:translate-y-[4px] transition-all duration-200 select-none",
// "bg-red-500 p-4 aspect-square border-8 border-black cursor-pointer hover:border-[#31992b]",
// "overflow-hidden"
