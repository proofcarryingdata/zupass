import { Spacer } from "@pcd/passport-ui";
import { ReactNode } from "react";
import { cn } from "../../../src/util";
import { NewButton } from "../../NewButton";
import { H1, Placeholder, ZuLogo } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

interface SubPage {
  image: string;
  title: string;
  pageLink: string;
}

export function MoreScreen(): ReactNode {
  const subPages: SubPage[] = [
    {
      image:
        "https://static.vecteezy.com/system/resources/thumbnails/024/743/322/small/duck-seamless-pattern-rubber-ducky-isolated-cartoon-illustration-bird-bath-shower-repeat-wallpaper-tile-background-gift-wrap-paper-yellow-vector.jpg",
      title: "DUCK",
      pageLink: "#/duck"
    },
    {
      image:
        "https://preview.redd.it/anyone-interested-in-making-the-animation-for-the-matrix-v0-4904jjjxjlja1.png?width=640&crop=smart&auto=webp&s=eafccbed81c07b01744f999e730b89623a47d379",
      title: "FHE",
      pageLink: "#/fhe"
    },
    {
      image:
        "https://media.istockphoto.com/id/1264809053/photo/pea-pods-on-a-background-of-green-leaves-and-dill.jpg?s=612x612&w=0&k=20&c=x1d_bOMJF5HT47nxX9EPoK_tlizTpV1LrRDsd3pRYiM=",
      title: "POD",
      pageLink: "#/pod"
    },
    {
      image:
        "https://engineering.fb.com/wp-content/uploads/2019/05/SecHero.jpg",
      title: "ZK",
      pageLink: "#/zk"
    },
    {
      image:
        "https://engineering.fb.com/wp-content/uploads/2019/05/SecHero.jpg",
      title: "0xPARC",
      pageLink: "#/0xparc"
    }
  ];

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
            onClick={() => {
              window.location.href = "#/";
            }}
          >
            Back
          </NewButton>

          <div className="grid grid-cols-2 gap-4 mt-[0.75rem] w-full">
            {subPages.map((page) => (
              <div
                key={page.title}
                className={squareStyle}
                onClick={() => {
                  window.location.href = page.pageLink;
                }}
                style={{
                  backgroundImage: `url('${page.image}')`,
                  backgroundSize: "cover"
                }}
              >
                <span className="bg-black rounded-xl px-2 py-1 border-white border-4">
                  {page.title}
                </span>
              </div>
            ))}
          </div>
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}

const squareStyle = cn(
  "rounded",
  "font-bold text-xl active:scale-[1.01] hover:translate-y-[-1px] active:translate-y-[2px] transition-all duration-200 select-none",
  "bg-red-500 p-4 aspect-square border-4 border-black cursor-pointer"
);
