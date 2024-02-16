import { api } from "@pagerduty/pdjs";
import { str } from "@pcd/util";
import { v4 as uuid } from "uuid";
import { logger } from "../util/logger";
import { setError, traceFlattenedObject, traced } from "./telemetryService";

const SERVICE_NAME = "PagerDutyService";
const LOG_TAG = `[${SERVICE_NAME}]`;

export enum PolicyName {
  Everyone = "Everyone",
  JustIvan = "JustIvan",
  JustRichard = "JustRichard"
}

const ESCALATION_POLICIES: Record<PolicyName, string /* policy id */> = {
  [PolicyName.Everyone]: "P6SUJ1N",
  [PolicyName.JustIvan]: "P3PE907",
  [PolicyName.JustRichard]: "P88YCS9"
};

function getPolicyId(name: PolicyName): string {
  return ESCALATION_POLICIES[name];
}

export class PagerDutyService {
  private api: ReturnType<typeof api>;
  private serviceId: string;

  public constructor(token: string, serviceId: string) {
    this.api = api({ token });
    this.serviceId = serviceId;
  }

  public async triggerIncident(
    title: string,
    message?: string,
    policyName?: PolicyName,
    incidentKey?: string
  ): Promise<{ id: string; key: string } | undefined> {
    return traced("PagerDutyService", "triggerIncident", async (span) => {
      try {
        incidentKey = incidentKey ?? uuid();
        message = message ?? "";
        const policyId = getPolicyId(policyName ?? PolicyName.Everyone);
        logger(LOG_TAG, `triggering incident '${title}' ('${incidentKey}')`);
        const request = {
          headers: {
            From: "ivan@0xparc.org"
          },
          data: {
            incident: {
              type: "incident",
              title: title,
              service: {
                id: this.serviceId,
                type: "service_reference"
              },
              urgency: "high",
              incident_key: incidentKey,
              body: {
                type: "incident_body",
                details: message
              }
            },
            escalation_policy: {
              id: policyId
            }
          }
        };
        traceFlattenedObject(span, { request: request });
        const res = await this.api.post("/incidents", request);
        const responseBody = res.data;
        traceFlattenedObject(span, { responseBody });

        if (res.status !== 201) {
          throw new Error(
            `failed to invoke pagerduty (${title}): ${str(responseBody)}`
          );
        }

        return {
          id: responseBody.incident.id,
          key: responseBody.incident.incident_key
        };
      } catch (e) {
        logger(
          LOG_TAG,
          `failed to start incident ${title} ('${incidentKey}')`,
          e
        );
        setError(e, span);
        return undefined;
      }
    });
  }

  public async resolveIncident(id: string): Promise<void> {
    return traced("PagerDutyService", "resolveIncident", async (span) => {
      try {
        const url = `/incidents/${id}`;
        logger(LOG_TAG, `resolving incident '${id}' by hitting '${url}'`);
        const request = {
          headers: {
            From: "ivan@0xparc.org"
          },
          data: {
            incident: { type: "incident_reference", status: "resolved" }
          }
        };
        traceFlattenedObject(span, { request });
        const res = await this.api.put(url, request);
        const responseBody = res.data;
        traceFlattenedObject(span, { responseBody });

        if (res.status !== 200) {
          throw new Error(
            `failed to resolve pagerduty (${id}): ${str(responseBody)}`
          );
        }

        logger(LOG_TAG, `resolved incident '${id}'`);
      } catch (e) {
        setError(e, span);
        logger(LOG_TAG, `failed to start incident ${id}`, e);
      }
    });
  }
}

export function startPagerDutyService(): PagerDutyService | null {
  logger("[INIT] attempting to start pager duty");

  const apiKey = process.env.PAGER_DUTY_API_KEY;
  const serviceId = process.env.PAGER_DUTY_SERVICE_ID;

  if (!apiKey) {
    logger(
      "[INIT] can't start pager duty - missing environment variable PAGER_DUTY_API_KEY"
    );
    return null;
  }

  if (!serviceId) {
    logger(
      "[INIT] can't start pager duty - missing environment variable PAGER_DUTY_API_KEY"
    );

    return null;
  }

  return new PagerDutyService(apiKey, serviceId);
}
