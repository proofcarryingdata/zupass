import opentelemetry from "@opentelemetry/api";
import * as fs from "fs";
import _ from "lodash";
import PQueue from "p-queue";
import * as path from "path";
import { promisify } from "util";
import { v4 as uuid } from "uuid";
import {
  Contribution,
  Contributor,
  initOctokit,
  loadOrganizationRepos,
  loadRepoByUrl,
  loadRepositoryContributors,
  loadUserKeys,
  PublicKey,
  Repo,
} from "../apis/githubAPI";
import { ApplicationContext } from "../types";
import { IS_PROD } from "../util/isProd";

const writeFile = promisify(fs.writeFile);

const params: InitialSyncParameters = {
  hardcodedOrganizationNames: ["ethereum"],
  hardcodedRepositoryUrls: ["https://github.com/ethers-io/ethers.js/"],
  hardcodedUsers: ["ichub"],
};

export function startGithubSyncLoop(context: ApplicationContext) {
  if (IS_PROD) {
    console.log("[INIT] Started github sync loop");
    githubSyncLoop();
  } else {
    console.log("[INIT] Did not start github sync loop");
  }
}

async function githubSyncLoop() {
  console.log("[GITHUB] Sync interval triggered");
  githubSync().then(() => {
    console.log("[GITHUB] Sync completed - scheduling another");
    setTimeout(() => {
      githubSyncLoop();
    }, 1000 * 60 * 60 * 1.5);
  });
}

export async function githubSync() {
  console.log("[GITHUB] Syncing github");
  return downloadPublicKeys()
    .then((keys) => {
      return savePublicKeys(keys);
    })
    .catch((e) => {
      console.log("[GITHUB] Failed to save public keys", e);
    });
}

async function downloadPublicKeys(): Promise<PublicKey[]> {
  const tracer = opentelemetry.trace.getTracer("github");
  console.log(`[GITHUB] initializing sync`, params);
  const syncId = uuid();

  return tracer.startActiveSpan("githubSync", async (span) => {
    span.setAttribute("syncId", syncId);
    const octokit = initOctokit();
    const queue = new PQueue({
      concurrency: 5,
      interval: 1000,
      intervalCap: 5,
    });

    const repos: Repo[] = [];
    const hardcodedRepositories = await Promise.all(
      params.hardcodedRepositoryUrls.map((url) =>
        loadRepoByUrl(url, octokit, queue)
      )
    );
    repos.push(...(hardcodedRepositories.filter((r) => !!r) as Repo[]));

    const orgRepositories = _.flatten(
      await Promise.all(
        params.hardcodedOrganizationNames.map((org) =>
          loadOrganizationRepos(org, octokit, queue)
        )
      )
    );
    repos.push(...orgRepositories);

    const contributions: Contribution[] = [];
    const allContributors: Contributor[] = [];

    await Promise.all(
      repos.map(async (repo) => {
        const contributors = await loadRepositoryContributors(
          repo,
          octokit,
          queue
        );
        contributors.forEach((c) =>
          contributions.push({
            contributor: c,
            repo,
          })
        );
        allContributors.push(...contributors);
      })
    );

    const uniqueContributors = _.uniqBy(allContributors, (c) => c.login);
    console.log(`[GITHUB] Loaded ${uniqueContributors.length} contributors`);

    const allKeys: PublicKey[] = [];
    await Promise.all(
      uniqueContributors.map(async (contributor, i) => {
        console.log(
          `[GITHUB] Contributor ${i + 1}/${uniqueContributors.length}`
        );

        if (!contributor.id) {
          return; // this contributor was anonymous.
        }

        const keys = await loadUserKeys(contributor.id, octokit, queue);
        allKeys.push(...keys);
      })
    );

    console.log(
      `[GITHUB] ${hardcodedRepositories.length} repositories
[GITHUB] ${contributions.length} contributions
[GITHUB] ${uniqueContributors.length} contributors
[GITHUB] ${allKeys.length} keys
[GITHUB] ${uniqueContributors.map((c) => c.login).join(", ")}
[GITHUB] Sync complete`
    );
    span.end();

    return allKeys;
  });
}

async function savePublicKeys(keys: PublicKey[]): Promise<void> {
  const savedKeyListPath = path.join(process.cwd(), "dev_keys.json");

  if (!IS_PROD) {
    console.log(`[GITHUB] Saving public keys to ${savedKeyListPath}`);
    await writeFile(savedKeyListPath, JSON.stringify(keys, null, 2));
  } else {
  }
}

export interface InitialSyncParameters {
  hardcodedOrganizationNames: string[];
  hardcodedRepositoryUrls: string[];
  hardcodedUsers: string[];
}
