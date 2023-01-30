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

export async function loadRepo(
  owner: string,
  repo: string,
  octokit: Octokit,
  queue: PQueue
): Promise<Repo> {
  return tracer.startActiveSpan("loadRepo", (span) => {
    span.setAttribute("repo", `${owner}${repo}`);
    return queue.add(() =>
      octokit.repos.get({ owner, repo }).then((r) => {
        span.end();
        return r.data;
      })
    );
  });
}

export async function loadRepoById(
  id: number,
  octokit: Octokit,
  queue: PQueue
): Promise<Repo> {
  return queue.add(() =>
    octokit.request("GET /repositories/:id", { id }).then((r) => r.data)
  ) as Promise<Repo>;
}

export async function loadRepoByUrl(
  repoUrl: string,
  octokit: Octokit,
  queue: PQueue
): Promise<Repo> {
  console.log(`[GITHUB] Loading repo ${repoUrl}`);

  const regex = /https:\/\/github.com\/(.*)\/(.*)\//;
  const match = repoUrl.match(regex);
  if (!match) {
    throw new Error(
      `Could not extract repository owner/repo from url ${match}`
    );
  }

  return loadRepo(match[1], match[2], octokit, queue);
}

export async function loadRepositoryContributors(
  repo: Repo,
  octokit: Octokit,
  queue: PQueue
): Promise<Contributor[]> {
  console.log(`[GITHUB] Loading repo contributors for ${repo.url}`);

  const contributors = await queue.add(() =>
    octokit.repos.listContributors({
      owner: repo.owner.login,
      repo: repo.name,
    })
  );

  console.log(
    `[GITHUB] Loaded ${contributors.data.length} contributors for ${repo.url}`
  );

  return contributors.data;
}

export async function getUserById(
  userId: number,
  octokit: Octokit,
  queue: PQueue
): Promise<User> {
  console.log(`[GITHUB] getting user by id ${userId}`);
  return queue.add(() =>
    octokit.request("GET /user/:id", { id: userId }).then((r) => r.data)
  ) as Promise<User>;
}

export async function loadUserKeys(
  userId: number,
  octokit: Octokit,
  queue: PQueue
): Promise<PublicKey[]> {
  const user = await getUserById(userId, octokit, queue);

  const r = await octokit.rest.users.listPublicKeysForUser({
    username: user.login,
  });

  console.log(`[GITHUB] loaded ${r.data.length} keys for user ${userId}`);

  return r.data;
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
