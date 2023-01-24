import { Octokit } from "@octokit/rest";
import PQueue from "p-queue";

const octocat = new Octokit();
type Unarray<T> = T extends Array<infer U> ? U : T;
type Repo = Awaited<ReturnType<typeof octocat.repos.get>>;
type Contributor = Unarray<
  Awaited<ReturnType<typeof octocat.repos.listContributors>>["data"]
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

  console.log(
    `[GITHUB] Sync complete
[GITHUB] ${hardcodedRepositories.length} repositories
[GITHUB] ${contributions.length} contributions
[GITHUB] ${allContributors.length} contributors
[GITHUB] ${allContributors.map((c) => c.login).join(", ")}`
  );
}

async function loadRepo(
  owner: string,
  repo: string,
  queue: PQueue
): Promise<Repo> {
  return queue.add(() => octocat.repos.get({ owner, repo }));
}

async function loadRepoById(id: number, queue: PQueue): Promise<Repo> {
  return queue.add(() =>
    octocat.request("GET /repositories/:id", { id })
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
    octocat.repos.listContributors({
      owner: repo.data.owner.login,
      repo: repo.data.name,
    })
  );

  console.log(
    `[GITHUB] Loaded ${contributors.data.length} contributors for ${repo.url}`
  );

  return contributors.data;
}

async function loadUserKeys(userId: number) {}
