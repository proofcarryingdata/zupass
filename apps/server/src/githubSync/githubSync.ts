import { Octokit } from "@octokit/rest";

const api = new Octokit();

const repositoryUrls = ["https://github.com/ethers-io/ethers.js/"];

type Unarray<T> = T extends Array<infer U> ? U : T;
type Repo = Awaited<ReturnType<typeof api.repos.get>>;
type Contributor = Unarray<
  Awaited<ReturnType<typeof api.repos.listContributors>>["data"]
>;
type Contribution = {
  contributor: Contributor;
  repo: Repo;
};

export async function githubSync(): Promise<void> {
  const hardcodedRepositories = await Promise.all(
    repositoryUrls.map(loadRepoByUrl)
  );

  console.log(
    `[GITHUB] initializing sync with ${hardcodedRepositories.length} repositories`
  );

  const contributions: Contribution[] = [];
  const contributors: Contributor[] = [];

  for (const repo of hardcodedRepositories) {
    const contributors = await loadRepositoryContributors(repo);
    contributors.forEach((c) =>
      contributions.push({
        contributor: c,
        repo,
      })
    );
    contributors.push(...contributors);
  }

  console.log(`[GITHUB] sync complete`);
}

async function loadRepo(owner: string, repo: string): Promise<Repo> {
  return api.repos.get({ owner, repo });
}

async function loadRepoById(id: number): Promise<Repo> {
  return api.request("GET /repositories/:id", { id }) as ReturnType<
    typeof api.repos.get
  >;
}

async function loadRepoByUrl(repoUrl: string): Promise<Repo> {
  console.log(`[GITHUB] Loading repo ${repoUrl}`);

  const regex = /https:\/\/github.com\/(.*)\/(.*)\//;
  const match = repoUrl.match(regex);
  if (!match) {
    throw new Error(
      `Could not extract repository owner/repo from url ${match}`
    );
  }

  return loadRepo(match[1], match[2]);
}

async function loadRepositoryContributors(repo: Repo): Promise<Contributor[]> {
  console.log(`[GITHUB] Loading repo contributors for ${repo.url}`);

  const contributors = await api.repos.listContributors({
    owner: repo.data.owner.login,
    repo: repo.data.name,
  });

  console.log(
    `[GITHUB] Loaded ${contributors.data.length} contributors for ${repo.url}`
  );

  return contributors.data;
}

async function loadUserKeys(userId: number) {}
