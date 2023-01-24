import { Octokit } from "@octokit/rest";
import _, { keys } from "lodash";
import PQueue from "p-queue";

const octokit = new Octokit();
type Unarray<T> = T extends Array<infer U> ? U : T;
type PublicKey = Unarray<
  Awaited<ReturnType<typeof octokit.users.listPublicKeysForUser>>["data"]
>;
type User = Awaited<ReturnType<typeof octokit.users.getByUsername>>["data"];
type Repo = Awaited<ReturnType<typeof octokit.repos.get>>["data"];
type Contributor = Unarray<
  Awaited<ReturnType<typeof octokit.repos.listContributors>>["data"]
>;
type Contribution = {
  contributor: Contributor;
  repo: Repo;
};

export async function githubSync(): Promise<void> {
  const repositoryUrls = ["https://github.com/ethers-io/ethers.js/"];

  const queue = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 1 });

  const hardcodedRepositories = await Promise.all(
    repositoryUrls.map((url) => loadRepoByUrl(url, queue))
  );

  console.log(
    `[GITHUB] initializing sync with ${hardcodedRepositories.length} repositories`
  );

  const contributions: Contribution[] = [];
  const allContributors: Contributor[] = [];

  for (const repo of hardcodedRepositories) {
    const contributors = await loadRepositoryContributors(repo, queue);
    contributors.forEach((c) =>
      contributions.push({
        contributor: c,
        repo,
      })
    );
    allContributors.push(...contributors);
  }

  const uniqueContributors = _.uniqBy(allContributors, (c) => c.login);
  const allKeys: PublicKey[] = [];

  for (const contributor of uniqueContributors) {
    if (!contributor.id) {
      continue; // this contributor was anonymous.
    }
    const keys = await loadUserKeys(contributor.id, queue);
    allKeys.push(...keys);
  }

  console.log(
    `[GITHUB] ${hardcodedRepositories.length} repositories
[GITHUB] ${contributions.length} contributions
[GITHUB] ${uniqueContributors.length} contributors
[GITHUB] ${allKeys.length} keys
[GITHUB] ${uniqueContributors.map((c) => c.login).join(", ")}
[GITHUB] Sync complete`
  );
}

async function loadRepo(
  owner: string,
  repo: string,
  queue: PQueue
): Promise<Repo> {
  return queue.add(() =>
    octokit.repos.get({ owner, repo }).then((r) => r.data)
  );
}

async function loadRepoById(id: number, queue: PQueue): Promise<Repo> {
  return queue.add(() =>
    octokit.request("GET /repositories/:id", { id }).then((r) => r.data)
  ) as Promise<Repo>;
}

async function loadRepoByUrl(repoUrl: string, queue: PQueue): Promise<Repo> {
  console.log(`[GITHUB] Loading repo ${repoUrl}`);

  const regex = /https:\/\/github.com\/(.*)\/(.*)\//;
  const match = repoUrl.match(regex);
  if (!match) {
    throw new Error(
      `Could not extract repository owner/repo from url ${match}`
    );
  }

  return loadRepo(match[1], match[2], queue);
}

async function loadRepositoryContributors(
  repo: Repo,
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

async function getUserById(userId: number, queue: PQueue): Promise<User> {
  console.log(`[GITHUB] getting user by id ${userId}`);
  return queue.add(() =>
    octokit.request("GET /user/:id", { id: userId }).then((r) => r.data)
  ) as Promise<User>;
}

async function loadUserKeys(
  userId: number,
  queue: PQueue
): Promise<PublicKey[]> {
  const user = await getUserById(userId, queue);

  const r = await octokit.rest.users.listPublicKeysForUser({
    username: user.login,
  });

  console.log(`[GITHUB] loaded ${r.data.length} keys for user ${userId}`);

  return r.data;
}
