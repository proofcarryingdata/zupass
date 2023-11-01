import {
  Biome,
  EdDSAFrogPCDPackage,
  TEMPERAMENT_MAX,
  TEMPERAMENT_MIN,
  Temperament
} from "@pcd/eddsa-frog-pcd";
import {
  Feed,
  FeedHost,
  HostedFeed,
  ListFeedsRequest,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDPermissionType } from "@pcd/pcd-collection";
import { PCDPackage } from "@pcd/pcd-types";
import _ from "lodash";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { FeedProviderName } from "../services/issuanceService";

/**
 * FrogCrypto specific feed configurations
 *
 * Note: It is important to ensure that the feed cannot be discovered by guessing the {@link Feed#id}
 */
export interface FrogCryptoFeed extends Feed<typeof EdDSAFrogPCDPackage> {
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
  /**
   * Biomes that can be issued from this feed
   */
  biomes: Biome[];
}

const commonFeedConfig: Pick<
  Feed,
  | "autoPoll"
  | "inputPCDType"
  | "partialArgs"
  | "credentialRequest"
  | "permissions"
> = {
  autoPoll: false,
  inputPCDType: undefined,
  partialArgs: undefined,
  credentialRequest: {
    signatureType: "sempahore-signature-pcd"
  },
  permissions: [
    {
      folder: "FrogCrypto",
      type: PCDPermissionType.AppendToFolder
    }
  ]
};

/**
 * Feed configuration that will eventually be stored in the database
 * and can be updated by GMs via a TG bot
 */
export const FROGCRYPTO_FEEDS: FrogCryptoFeed[] = [
  {
    id: "85b139fa-3665-4b96-a7bd-77c6c4ed18cd",
    name: "Bog",
    description: "Bog",
    private: false,
    active: true,
    cooldown: 60,
    biomes: [Biome.Jungle, Biome.Swamp, Biome.Unknown]
  },
  {
    id: "9e827420-79c4-4a84-b8d3-65cecdf495bc",
    name: "Cog",
    description: "Cog",
    private: true,
    active: true,
    cooldown: 180,
    biomes: [Biome.Jungle, Biome.Swamp, Biome.Unknown]
  },
  {
    id: "4fdb8af9-5334-4037-a176-cef05158ef66",
    name: "Dog",
    description: "Dog",
    private: true,
    active: false,
    cooldown: 60,
    biomes: [Biome.Jungle, Biome.Swamp, Biome.Unknown]
  },
  {
    id: "ca2e9b76-2337-4eb6-8b08-40191bb5017d",
    name: "God",
    description: "God",
    private: true,
    active: true,
    cooldown: 600,
    biomes: [Biome.TheWrithingVoid]
  }
].map((config) => ({ ...config, ...commonFeedConfig }));

export class FrogCryptoFeedHost extends FeedHost<FrogCryptoFeed> {
  public constructor(feeds: HostedFeed<FrogCryptoFeed>[]) {
    super(
      feeds,
      `${process.env.PASSPORT_SERVER_URL}/frogcrypto/feeds`,
      FeedProviderName.FROGCRYPTO
    );
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

export function sampleFrogAttribute(min?: number, max?: number): number {
  return _.random(Math.round(min || 0), Math.round(max || 10));
}

export function parseFrogEnum(
  e: Record<number, string>,
  value: string
): number {
  const key = _.findKey(e, (v) => v.toLowerCase() === value.toLowerCase());
  if (key === undefined) {
    throw new Error(`invalid enum value ${value}`);
  }
  return parseInt(key);
}

export function parseFrogTemperament(value?: string): Temperament {
  if (!value) {
    return _.random(TEMPERAMENT_MIN, TEMPERAMENT_MAX);
  }
  if (value === "N/A") {
    return Temperament.N_A;
  }
  if (value === "???") {
    return Temperament.UNKNOWN;
  }
  return parseFrogEnum(Temperament, value);
}
