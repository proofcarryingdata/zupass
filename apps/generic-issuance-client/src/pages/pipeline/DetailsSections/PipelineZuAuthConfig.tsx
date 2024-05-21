import { CheckIcon, CopyIcon } from "@chakra-ui/icons";
import { Button, Spacer, useToast } from "@chakra-ui/react";
import { PipelineZuAuthConfig } from "@pcd/passport-interface";
import _ from "lodash";
import { ReactNode, useCallback, useState } from "react";

/**
 * Used to display data for configuring ZuAuth.
 */
export function PipelineZuAuthConfigSection({
  pipelineZuAuthConfig
}: {
  pipelineZuAuthConfig?: PipelineZuAuthConfig[];
}): ReactNode {
  const toast = useToast();
  const [copied, setCopied] = useState<boolean>(false);
  const [includeProductOptions, setIncludeProductOptions] =
    useState<boolean>(true);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
          toast({
            duration: 1500,
            title: `Copied to clipboard`,
            status: "info",
            position: "bottom-right"
          });
        })
        .catch(() => {
          toast({
            title: `Could not copy text to clipboard`,
            status: "error",
            position: "bottom-right"
          });
        });
    },
    [toast]
  );

  if (!pipelineZuAuthConfig || pipelineZuAuthConfig.length === 0) {
    return <div>No ZuAuth configuration available for this pipeline.</div>;
  }

  let json: string;
  /**
   * If the boolean value `includeProductOptions` is false, we should filter
   * out the product-specific data from the ZuAuth config.
   *
   * We do this by mapping over the config items and returning them without
   * the product ID or product name fields, then filtering the result for the
   * remaining unique items. If there's only one event then there will only be
   * one item, but pipelines can have multiple events.
   */
  if (!includeProductOptions) {
    json = JSON.stringify(
      _.uniqWith(
        pipelineZuAuthConfig.map(
          ({ eventId, eventName, publicKey, pcdType }) =>
            ({
              pcdType,
              publicKey,
              eventId,
              eventName
            }) satisfies PipelineZuAuthConfig
        ),
        _.isEqual
      ),
      null,
      2
    );
  } else {
    json = JSON.stringify(pipelineZuAuthConfig, null, 2);
  }

  return (
    <div>
      <div>
        <label>
          Include product options? &nbsp;
          <input
            type="checkbox"
            checked={includeProductOptions}
            onChange={(ev) => setIncludeProductOptions(ev.target.checked)}
          />
        </label>
      </div>
      <Spacer h={2} />
      <hr />
      <Spacer h={2} />
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontSize: "12px",
          position: "relative"
        }}
      >
        <div style={{ position: "absolute", right: 0, top: 0 }}>
          <Button
            size="sm"
            onClick={() => copyToClipboard(json)}
            colorScheme={copied ? "green" : "gray"}
          >
            {copied && <CheckIcon w="4" h="4" />}
            {!copied && <CopyIcon w="4" h="4" />}
          </Button>
        </div>
        <code style={{ paddingTop: "0.5rem", display: "block" }}>{json}</code>
      </pre>
    </div>
  );
}
