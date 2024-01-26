import {
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import _ from "lodash";

export interface LemonadeTicket {
  id: string;
  name: string;
  eventId: string;
  tierId: string;
}

export interface LemonadeTicketTier {
  name: string;
  id: string;
}

export interface LemonadeEvent {
  id: string;
  name: string;
  tickets: LemonadeTicket[];
  tiers: LemonadeTicketTier[];
}

export interface ILemonadeAPI {
  loadEvents(apiKey: string): Promise<LemonadeEvent[]>;
  checkinTicket(ticketId: string): Promise<boolean>;
}

export class MockLemonadeAPI implements ILemonadeAPI {
  public readonly ALLOWED_KEY = "allowed";

  private data: { events: LemonadeEvent[] };

  public constructor(data: { events: LemonadeEvent[] }) {
    this.data = data;
  }

  public async loadEvents(apiKey: string): Promise<LemonadeEvent[]> {
    if (apiKey === this.ALLOWED_KEY) {
      return this.data.events;
    } else {
      throw new Error("not allowed");
    }
  }

  public async checkinTicket(_ticketId: string): Promise<boolean> {
    // todo
    throw new Error("not implemented");
  }
}

export interface GenericIssuanceUser {
  id: string;
  email: string;
  timeCreated: Date;
  timeUpdated: Date;
  isAdmin: boolean;
}

export interface BasePipelineDefinition {
  id: string;
  ownerUserId: string;
  editorUserIds: string[];
}

export interface LemonadePipelineDefinition extends BasePipelineDefinition {
  type: PipelineType.Lemonade;
  options: LemonadePipelineOptions;
}

export function isLemonadePipelineDefinition(
  d: PipelineDefinition
): d is LemonadePipelineDefinition {
  return d.type === PipelineType.Lemonade;
}

export interface PretixPipelineDefinition extends BasePipelineDefinition {
  type: PipelineType.Pretix;
  options: PretixPipelineOptions;
}

export function isPretixPipelineDefinition(
  d: PipelineDefinition
): d is PretixPipelineDefinition {
  return d.type === PipelineType.Pretix;
}

export type PipelineDefinition =
  | LemonadePipelineDefinition
  | PretixPipelineDefinition;

export interface LemonadePipelineOptions {
  lemonadeApiKey: string;
  events: LemonadeEventConfig[];
}

export interface LemonadeEventConfig {
  id: string;
  name: string;
  ticketTiers: string[];
}

export interface PretixPipelineOptions {
  pretixAPIKey: string;
  pretixOrgUrl: string;
  events: PretixEventConfig[];
}

export interface PretixEventConfig {
  id: string;
  name: string;
  productIds: string[];
  superUserProductIds: string[];
}

export enum PipelineType {
  Lemonade = "Lemonade",
  Pretix = "Pretix"
}

export interface PipelineAtom {
  id: string; // unique per pipeline configuration
}

export interface PipelineAtomDB {
  save(pipelineID: string, atoms: PipelineAtom[]): Promise<void>;
  load(pipelineID: string): Promise<PipelineAtom[]>;
}

export class MockPipelineAtomDB {
  public data: {
    [pipelineId: string]: { [atomId: string]: PipelineAtom };
  } = {};

  public async save(pipelineID: string, atoms: PipelineAtom[]): Promise<void> {
    if (!this.data[pipelineID]) {
      this.data[pipelineID] = {};
    }
    atoms.forEach((atom) => {
      this.data[pipelineID][atom.id] = atom;
    });
  }

  public async load(pipelineID: string): Promise<PipelineAtom[]> {
    if (!this.data[pipelineID]) {
      return [];
    }

    return Object.values(this.data[pipelineID]);
  }
}

export enum PipelineCapability {
  FeedIssuanceCapability = "FeedIssuanceCapability",
  CheckinCapability = "CheckinCapability"
}

export interface BasePipelineCapability {
  type: PipelineCapability;
}

export interface FeedIssuanceCapability extends BasePipelineCapability {
  type: PipelineCapability.FeedIssuanceCapability;
  subId: string;
  issue(credential: SerializedPCD): Promise<PollFeedResponseValue>;
}

export interface CheckinCapability extends BasePipelineCapability {
  type: PipelineCapability.CheckinCapability;
  checkin(request: CheckTicketInRequest): Promise<CheckTicketInResponseValue>;
}

export interface BasePipeline {
  type: PipelineType;
  capabilities: readonly BasePipelineCapability[];
}

export interface LemonadeAtom extends PipelineAtom {
  // todo
}

export class LemonadePipeline implements BasePipeline {
  public type = PipelineType.Lemonade;
  public capabilities = [
    {
      issue: this.issue.bind(this),
      subId: "ticket-feed",
      type: PipelineCapability.FeedIssuanceCapability
    } satisfies FeedIssuanceCapability,
    {
      checkin: this.checkin.bind(this),
      type: PipelineCapability.CheckinCapability
    } satisfies CheckinCapability
  ];

  private definition: LemonadePipelineDefinition;
  private db: PipelineAtomDB;
  private api: ILemonadeAPI;

  public get id(): string {
    return this.definition.id;
  }

  public constructor(
    definition: LemonadePipelineDefinition,
    db: PipelineAtomDB,
    api: ILemonadeAPI
  ) {
    this.definition = definition;
    this.db = db;
    this.api = api;
  }

  public async load(): Promise<void> {
    const events = await this.api.loadEvents(
      this.definition.options.lemonadeApiKey
    );
    const tickets = _.flatMap(events, (e) => e.tickets);
    const relevantTickets = tickets.filter((t) => {
      const eventConfig = this.definition.options.events.find(
        (e) => e.id === t.eventId
      );

      if (!eventConfig) {
        return false;
      }

      const eventConfigHasTicketTier = eventConfig.ticketTiers.includes(
        t.tierId
      );
      return eventConfigHasTicketTier;
    });

    const atomsToSave: LemonadeAtom[] = relevantTickets.map((t) => {
      return {
        id: t.id
      };
    });

    this.db.save(this.definition.id, atomsToSave);
  }

  private async issue(
    _credential: SerializedPCD
  ): Promise<PollFeedResponseValue> {
    return {
      actions: []
    };
  }

  private async checkin(
    _request: CheckTicketInRequest
  ): Promise<CheckTicketInResponseValue> {
    // todo
    this.api.checkinTicket("get ticket id from request");
  }

  public static is(p: Pipeline): p is LemonadePipeline {
    return p.type === PipelineType.Lemonade;
  }
}

/**
 * TODO
 */
export class PretixPipeline implements BasePipeline {
  public type = PipelineType.Pretix;
  public capabilities = []; // TODO: fill this out

  private definition: PretixPipelineDefinition;
  private db: PipelineAtomDB;

  public constructor(definition: PretixPipelineDefinition, db: PipelineAtomDB) {
    this.definition = definition;
    this.db = db;
  }

  public static is(p: Pipeline): p is PretixPipeline {
    return p.type === PipelineType.Pretix;
  }
}

export type Pipeline = LemonadePipeline | PretixPipeline;

export function createPipeline(
  definition: PipelineDefinition,
  db: PipelineAtomDB,
  apis: {
    lemonadeAPI: ILemonadeAPI;
    // TODO: pretix api
  }
): Pipeline {
  if (isLemonadePipelineDefinition(definition)) {
    return new LemonadePipeline(definition, db, apis.lemonadeAPI);
  } else if (isPretixPipelineDefinition(definition)) {
    return new PretixPipeline(definition, db);
  }

  throw new Error(
    `couldn't instantiate pipeline for configuration ${JSON.stringify(
      definition
    )}`
  );
}

export class GenericIssuanceService {}
