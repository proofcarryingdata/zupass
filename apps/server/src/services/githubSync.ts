import opentelemetry from "@opentelemetry/api";
import _ from "lodash";
import PQueue from "p-queue";
import {
  Contribution,
  Contributor,
  initOctokit,
  loadRepoByUrl,
  loadRepositoryContributors,
  loadUserKeys,
  PublicKey,
} from "../apis/githubAPI";

export async function githubSync(): Promise<void> {
  const tracer = opentelemetry.trace.getTracer("github");

  tracer.startActiveSpan("githubSync", async (span) => {
    const repositoryUrls = ["https://github.com/ethers-io/ethers.js/"];
    const octokit = initOctokit();
    const queue = new PQueue({
      concurrency: 1,
      interval: 1000,
      intervalCap: 1,
    });

    const hardcodedRepositories = await Promise.all(
      repositoryUrls.map((url) => loadRepoByUrl(url, octokit, queue))
    );

    console.log(
      `[GITHUB] initializing sync with ${hardcodedRepositories.length} repositories`
    );

    const contributions: Contribution[] = [];
    const allContributors: Contributor[] = [];

    for (const repo of hardcodedRepositories) {
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
    }

    const uniqueContributors = _.uniqBy(allContributors, (c) => c.login);
    const allKeys: PublicKey[] = [];

    for (const contributor of uniqueContributors) {
      if (!contributor.id) {
        continue; // this contributor was anonymous.
      }
      const keys = await loadUserKeys(contributor.id, octokit, queue);
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
    span.end();
  });
}
