/**
 * {@link Pipeline}s can have external-facing APIs. Anything that an external
 * user can do with a Pipeline needs to be represented as a {@link PipelineCapability}.
 */
export enum PipelineCapability {
  FeedIssuance = "FeedIssuance",
  Checkin = "Checkin",
  SemaphoreGroup = "SemaphoreGroup"
}
