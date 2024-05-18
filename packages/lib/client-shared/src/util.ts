/**
 * Settings for calling {@link gpcArtifactDownloadURL} as parsed from an
 * environment variable by {@link parseGPCArtifactsConfig}.
 */
export type GPCArtifactsConfigEnv = {
  source: string | undefined;
  stability: string | undefined;
  version: string | undefined;
};

/**
 * The version of the latest supported version of artifacts published on NPM.
 */
export const GPC_ARTIFACTS_NPM_VERSION = "0.0.2";

/**
 * Parse configuration overrides for GPC artifact download from a string
 * environment variable, or provides default values if not set.
 *
 * @param envConfig environment variable value for override
 * @returns config variables suitable for calling {@link gpcArtifactDownloadURL}.
 */
export function parseGPCArtifactsConfig(
  envConfig: string | undefined
): GPCArtifactsConfigEnv {
  const defaultConfig = {
    source: "unpkg",
    stability: "prod",
    version: GPC_ARTIFACTS_NPM_VERSION
  };
  if (
    envConfig === undefined ||
    envConfig === "" ||
    envConfig === "undefined"
  ) {
    return defaultConfig;
  }
  const config = JSON.parse(envConfig);
  return {
    source: config.source ?? defaultConfig.source,
    stability: config.stability ?? defaultConfig.stability,
    version: config.version ?? defaultConfig.version
  };
}
