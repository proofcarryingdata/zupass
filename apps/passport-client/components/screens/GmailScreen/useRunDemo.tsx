import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import { ArgumentTypeName, PCD } from "@pcd/pcd-types";
import {
  PODEntries,
  PODPCDClaim,
  PODPCDPackage,
  PODPCDProof
} from "@pcd/pod-pcd";
import { randomUUID, sleep } from "@pcd/util";
import { useStateContext } from "../../../src/appHooks";
import { savePCDs } from "../../../src/localstorage";

interface DemoPCDTask {
  pcd: PCD;
  folder: string;
  timeout: number;
}

async function makePod(
  pkey: string,
  values: Record<string, string>
): Promise<PCD<PODPCDClaim, PODPCDProof>> {
  const entries: PODEntries = {};
  for (const [k, v] of Object.entries(values)) {
    entries[k] = {
      type: "string",
      value: v
    };
  }

  return await PODPCDPackage.prove({
    entries: {
      value: entries,
      argumentType: ArgumentTypeName.Object
    },
    privateKey: {
      value: pkey,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: randomUUID(),
      argumentType: ArgumentTypeName.String
    }
  });
}

export function useRunDemo(): () => Promise<void> {
  const state = useStateContext();
  const pkey = newEdDSAPrivateKey();

  return async () => {
    alert("running demo");
    const tasks: DemoPCDTask[] = [
      {
        pcd: await makePod(pkey, {
          zupass_title: "hello world",
          content: "welcome to zupass"
        }),
        folder: "announcements",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_title: "this is zmail",
          content: "this is zmail"
        }),
        folder: "announcements",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_title: "you can use it to look at your PODs",
          content: "you can use it to look at your PODs"
        }),
        folder: "announcements",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_title: "have fun!",
          content: "xD"
        }),
        folder: "announcements",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "friendly kitty",
          zupass_description: "friendly kitty says hello",
          zupass_image_url:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Felis_catus-cat_on_snow.jpg/358px-Felis_catus-cat_on_snow.jpg",
          content: "xD"
        }),
        folder: "kitties",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "kitten",
          zupass_description: "xD",
          zupass_image_url:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Juvenile_Ragdoll.jpg/1200px-Juvenile_Ragdoll.jpg"
        }),
        folder: "kitties",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title:
            "tweet: what are we supposed to do with these giant bottles of tea?",
          zupass_description: "xD",
          zupass_image_url: "https://i.imgur.com/tYJPcBO.jpeg"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "tweet: thinking about ants",
          zupass_description: "ant ant ant",
          zupass_image_url: "https://i.redd.it/zdo10qa8e85b1.jpg"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "tweet: Just learned how to make origami cranes!",
          zupass_description: "Feeling accomplished",
          zupass_image_url:
            "https://content.instructables.com/F6O/PDL9/IBJ769QN/F6OPDL9IBJ769QN.jpg?auto=webp&frame=1&width=320&md=1c8c0ceb8ed7e7ba611ef1cd5365bfe9"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title:
            "tweet: Who else is excited for the new Avengers movie?",
          zupass_description: "Can't wait to see it!",
          zupass_image_url:
            "https://www.photomural.com/media/catalog/product/cache/2/thumbnail/9df78eab33525d08d6e5fb8d27136e95/I/A/IADX10-065.jpg"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "tweet: Just finished a 5K run. Personal best!",
          zupass_description: "Feeling proud",
          zupass_image_url:
            "https://i0.wp.com/post.healthline.com/wp-content/uploads/2020/01/Runner-training-on-running-track-1296x728-header-1296x728.jpg?w=1155&h=1528"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title:
            "tweet: Made pancakes for breakfast. They're shaped like Mickey Mouse!",
          zupass_description: "Breakfast of champions",
          zupass_image_url:
            "https://i0.wp.com/dropofdisney.com/wp-content/uploads/2023/02/IMG_1707-2.jpg?fit=2500%2C2500&ssl=1"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "tweet: Found a four-leaf clover today. Lucky me!",
          zupass_description: "Nature's little surprises",
          zupass_image_url:
            "https://www.thespruce.com/thmb/W0ZgVN7zCzyweXRgcJ21vNVxmGA=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/GettyImages-BB9905-006-d4cc008f1ba74651bd6f9b3deb39ab86.jpg"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "tweet: Just adopted a rescue puppy. Meet Max!",
          zupass_description: "New family member",
          zupass_image_url:
            "https://bestfriendspetcare.com/wp-content/uploads/2020/06/puppy-play-group-beagle.jpg"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "tweet: Tried a new recipe for dinner. It's a hit!",
          zupass_description: "Cooking adventures",
          zupass_image_url:
            "https://yummydinobuddies.com/app/uploads/2021/09/22693_3D_21oz_DinoTheOriginal_M37_P1929004_Horiz-610x555.jpg"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title:
            "tweet: Just finished reading a great book. Any recommendations?",
          zupass_description: "Bookworm life",
          zupass_image_url:
            "https://kenzierenee.wordpress.com/wp-content/uploads/2012/08/2-bookworm.jpg"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "tweet: Planted my first vegetable garden today!",
          zupass_description: "Green thumb in progress",
          zupass_image_url:
            "https://hips.hearstapps.com/hmg-prod/images/claude-monets-house-and-gardens-in-giverny-france-news-photo-1042013294-1562610151.jpg"
        }),
        folder: "tweets",
        timeout: 1000
      },
      {
        pcd: await makePod(pkey, {
          zupass_display: "collectable",
          zupass_title: "tweet: Just saw a double rainbow. What does it mean?",
          zupass_description: "Nature's beauty",
          zupass_image_url:
            "https://www.rainbowsymphony.com/cdn/shop/articles/fully-double-rainbow-909264_850x.jpg?v=1692384969"
        }),
        folder: "tweets",
        timeout: 1000
      }
    ];
    alert("generated tasks");

    console.log(`demo contains ${tasks.length} tasks`);
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      state.getState().pcds.add(task.pcd);
      state.getState().pcds.setFolder(task.pcd.id, task.folder);
      await savePCDs(state.getState().pcds);
      await sleep(task.timeout);
    }
  };
}
