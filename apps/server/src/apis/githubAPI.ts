import { Octokit } from "@octokit/rest";
import opentelemetry from "@opentelemetry/api";
import PQueue from "p-queue";
import { Unarray } from "../util/types";

const tracer = opentelemetry.trace.getTracer("github");

export function initOctokit() {
  if (process.env.GITHUB_API_KEY === undefined) {
    throw new Error("Missing environment variable: GITHUB_API_KEY");
  }

  return new Octokit({ auth: process.env.GITHUB_API_KEY });
}

export async function getAPIRateLimit(octokit: Octokit) {
  const rateLimit = await octokit.rateLimit.get();
  return rateLimit.data.rate;
}

export async function loadOrganizationRepos(
  orgName: string,
  octokit: Octokit,
  queue: PQueue
): Promise<Repo[]> {
  return tracer.startActiveSpan("loadOrganizationRepos", async (span) => {
    console.log(`[GITHUB] Loading organzation repos for ${orgName}`);
    span.setAttribute("orgName", orgName);
    return queue
      .add(() =>
        octokit.repos.listForOrg({
          org: orgName,
          type: "public",
          sort: "updated",
          direction: "desc",
          per_page: 100,
        })
      )
      .then((r) => {
        span.end();
        console.log(
          `[GITHUB] Loaded ${r.data.length} repositories for org ${orgName}`
        );
        return r.data as Repo[];
      })
      .catch((e) => {
        span.end();
        console.log(`[GITHUB] Loading organzation repos for ${orgName}`, e);
        return [];
      });
  });
}

export async function loadRepo(
  owner: string,
  repo: string,
  octokit: Octokit,
  queue: PQueue
): Promise<Repo | undefined> {
  return tracer.startActiveSpan("loadRepo", (span) => {
    span.setAttribute("repo", `${owner}/${repo}`);
    console.log(`[GITHUB] Loading repo ${owner}/${repo}`);
    return queue.add(() =>
      octokit.repos
        .get({ owner, repo })
        .then((r) => {
          span.end();
          return r.data;
        })
        .catch((e) => {
          span.end();
          console.log(`[GITHUB] Failed to load repo ${owner}/${repo}`, e);
          return undefined;
        })
    );
  });
}

export async function loadRepoById(
  id: number,
  octokit: Octokit,
  queue: PQueue
): Promise<Repo | undefined> {
  return tracer.startActiveSpan("loadRepoById", (span) => {
    span.setAttribute("repoId", id);
    console.log(`[GITHUB] Loading repo by id ${id}`);
    return queue.add(() =>
      octokit
        .request("GET /repositories/:id", { id })
        .then((r) => {
          span.end();
          return r.data;
        })
        .catch((e) => {
          span.end();
          console.log(`[GITHUB] Couldn't load repo by id ${id}`, e);
          return undefined;
        })
    ) as Promise<Repo | undefined>;
  });
}

export async function loadRepoByUrl(
  repoUrl: string,
  octokit: Octokit,
  queue: PQueue
): Promise<Repo | undefined> {
  const regex = /https:\/\/github.com\/(.*)\/(.*)\//;
  const match = repoUrl.match(regex);
  if (!match) {
    console.log(
      `[GITHUB] Could not extract repository owner/repo from url ${match}`
    );
    return undefined;
  }

  return loadRepo(match[1], match[2], octokit, queue);
}

export async function loadRepositoryContributors(
  repo: Repo,
  octokit: Octokit,
  queue: PQueue
): Promise<Contributor[]> {
  return tracer.startActiveSpan("loadRepositoryContributors", async (span) => {
    span.setAttribute("repo", `${repo.full_name}`);
    console.log(`[GITHUB] Loading repo contributors for ${repo.url}`);
    return queue.add(() =>
      octokit.repos
        .listContributors({
          owner: repo.owner.login,
          repo: repo.name,
        })
        .then((r) => {
          span.end();
          if (r.data) {
            console.log(
              `[GITHUB] Loaded ${r.data.length} contributors for ${repo.url}`
            );
            return r.data;
          } else {
            console.log(`[GITHUB] repo ${repo.url} has no contributors`);
            return [];
          }
        })
        .catch((e) => {
          span.end();
          console.log(
            `[GITHUB] failed to load contributors for repo ${repo.url}`,
            e
          );
          return [];
        })
    );
  });
}

export async function getUserById(
  userId: number,
  octokit: Octokit,
  queue: PQueue
): Promise<User | undefined> {
  return tracer.startActiveSpan("getUserById", async (span) => {
    span.setAttribute("userId", userId);
    console.log(`[GITHUB] getting user by id ${userId}`);

    return queue.add(() =>
      octokit
        .request("GET /user/:id", { id: userId })
        .then((r) => {
          span.end();
          return r.data;
        })
        .catch((e) => {
          span.end();
          console.log(`[GITHUB] failed to get user by id ${userId}`, e);
          return undefined;
        })
    ) as Promise<User | undefined>;
  });
}

export async function loadUserKeys(
  userId: number,
  octokit: Octokit,
  queue: PQueue
): Promise<PublicKey[]> {
  return tracer.startActiveSpan("loadUserKeys", async (span) => {
    const user = await getUserById(userId, octokit, queue);

    if (!user) {
      return [];
    }

    return octokit.rest.users
      .listPublicKeysForUser({
        username: user.login,
      })
      .then((r) => {
        span.end();
        console.log(`[GITHUB] loaded ${r.data.length} keys for user ${userId}`);
        return r.data;
      })
      .catch((e) => {
        span.end();
        console.log(`[GITHUB] failed to load keys for user ${userId}`, e);
        return [];
      });
  });
}

export type PublicKey = Unarray<
  Awaited<ReturnType<Octokit["users"]["listPublicKeysForUser"]>>["data"]
>;
export type User = Awaited<
  ReturnType<Octokit["users"]["getByUsername"]>
>["data"];
export type Repo = Awaited<ReturnType<Octokit["repos"]["get"]>>["data"];
export type Contributor = Unarray<
  Awaited<ReturnType<Octokit["repos"]["listContributors"]>>["data"]
>;
export type Contribution = {
  contributor: Contributor;
  repo: Repo;
};
