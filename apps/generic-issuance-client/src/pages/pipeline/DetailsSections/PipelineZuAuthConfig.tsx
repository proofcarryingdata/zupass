import { CheckIcon, CopyIcon } from "@chakra-ui/icons";
import { Button, useToast } from "@chakra-ui/react";
import { PipelineZuAuthConfig } from "@pcd/passport-interface";
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

  const json = JSON.stringify(pipelineZuAuthConfig, null, 2);

  return (
    <div>
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
