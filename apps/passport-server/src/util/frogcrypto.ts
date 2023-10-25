import { Biome, IFrogData, Rarity, Temperament } from "@pcd/eddsa-frog-pcd";
import {
  Feed,
  FeedHost,
  HostedFeed,
  ListFeedsRequest,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import _ from "lodash";
import { PCDHTTPError } from "../routing/pcdHttpError";

export interface FrogCryptoFeedConfig {
  /**
   * Unique identifier for this feed. It is important to ensure that the feed cannot be discovered by guessing the ID.
   */
  id: string;
  name: string;
  description: string;
  /**
   * Whether this feed is discoverable in GET /feeds
   *
   * A feed can still be queried as GET /feeds/:feedId or polled as POST /feeds even if it is not discoverable
   * as long as the user knows the feed ID.
   * @default false
   */
  private: boolean;
  /**
   * PCD can only be issued from this feed if it is active
   * @default false
   *
   * TODO: There is no way to schedule a feed to become active/inactive yet.
   * We could add a separate scheduler service that will update the database to set the feed to active/inactive
   * based on configured schedules.
   */
  active: boolean;
  /**
   * How long to wait between each PCD issuance in seconds
   */
  cooldown: number;
}

/**
 * Feed configuration that will eventually be stored in the database
 * and can be updated by GMs via a TG bot
 */
export const FROGCRYPTO_FEEDS: FrogCryptoFeedConfig[] = [
  {
    id: "85b139fa-3665-4b96-a7bd-77c6c4ed18cd",
    name: "Bog",
    description: "Bog",
    private: false,
    active: true,
    cooldown: 60
  },
  {
    id: "9e827420-79c4-4a84-b8d3-65cecdf495bc",
    name: "Cog",
    description: "Cog",
    private: true,
    active: true,
    cooldown: 180
  },
  {
    id: "4fdb8af9-5334-4037-a176-cef05158ef66",
    name: "Dog",
    description: "Dog",
    private: true,
    active: false,
    cooldown: 60
  }
];

export interface FrogCryptoFeed extends Feed, FrogCryptoFeedConfig {}

export class FrogCryptoFeedHost extends FeedHost<FrogCryptoFeed> {
  public constructor(
    feeds: HostedFeed<FrogCryptoFeed>[],
    providerUrl: string,
    providerName: string
  ) {
    super(feeds, providerUrl, providerName);
  }

  public handleFeedRequest(
    request: PollFeedRequest<PCDPackage<any, any, any, any>>
  ): Promise<PollFeedResponseValue> {
    const feed = this.hostedFeed.find((f) => f.feed.id === request.feedId);
    if (!feed) {
      throw new PCDHTTPError(
        404,
        `couldn't find feed with id ${request.feedId}`
      );
    }
    if (!feed.feed.active) {
      throw new PCDHTTPError(
        404,
        `feed with id ${request.feedId} is not active`
      );
    }

    return feed.handleRequest(request);
  }

  public async handleListFeedsRequest(
    _request: ListFeedsRequest
  ): Promise<ListFeedsResponseValue> {
    return {
      providerName: this.providerName,
      providerUrl: this.providerUrl,
      feeds: this.hostedFeed.map((f) => f.feed).filter((f) => !f.private)
    };
  }
}

// TODO: This is a temporary hack to get the server to work.
// We will store this in the database eventually.
// This key is `${feedId}_${identity}`
const LAST_FETCHED_AT = new Map<string, number>();

/**
 * Returns the number of milliseconds until the next fetch is available.
 */
export async function getNextFetchAvailable(
  id: string,
  feed: FrogCryptoFeedConfig
): Promise<number> {
  const lastFetchedAt = LAST_FETCHED_AT.get(`${feed.id}_${id}`) ?? 0;
  const now = Date.now();
  return Math.max(0, lastFetchedAt + feed.cooldown * 1000 - now);
}

export async function createFrogData(
  serializedPCD: SerializedPCD<SemaphoreSignaturePCD>,
  feed: FrogCryptoFeedConfig
): Promise<IFrogData> {
  if (serializedPCD.type !== SemaphoreSignaturePCDPackage.name) {
    throw new Error("Invalid PCD type");
  }
  const pcd = await SemaphoreSignaturePCDPackage.deserialize(serializedPCD.pcd);
  const id = pcd.claim.identityCommitment;

  const nextFetchAvailable = await getNextFetchAvailable(id, feed);
  if (nextFetchAvailable > 0) {
    throw new PCDHTTPError(
      403,
      `Next fetch available in ${nextFetchAvailable} milliseconds`
    );
  }
  LAST_FETCHED_AT.set(`${feed.id}_${id}`, Date.now());

  // TODO: sample frog from db
  const frogPaths: string[] = [
    "images/frogs/frog.jpeg",
    "images/frogs/frog2.jpeg",
    "images/frogs/frog3.jpeg",
    "images/frogs/frog4.jpeg"
  ];

  return {
    name: "test name",
    description: "test description",
    imageUrl: _.sample(frogPaths) ?? "",
    frogId: 0,
    biome: Biome.Unknown,
    rarity: Rarity.Unknown,
    temperament: Temperament.UNKNOWN,
    jump: _.random(0, 10),
    speed: _.random(0, 10),
    intelligence: _.random(0, 10),
    beauty: _.random(0, 10),
    timestampSigned: Date.now(),
    ownerSemaphoreId: id
  };
}
