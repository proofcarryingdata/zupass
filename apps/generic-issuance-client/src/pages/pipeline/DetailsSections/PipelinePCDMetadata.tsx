import { CheckIcon, CopyIcon } from "@chakra-ui/icons";
import { Button, useToast } from "@chakra-ui/react";
import { PipelinePCDMetadata } from "@pcd/passport-interface";
import { ReactNode, useCallback, useState } from "react";

/**
 * Used to display metadata about the PCDs produced by the pipeline.
 */
export function PipelinePCDMetadataSection({
  pipelinePCDMetadata
}: {
  pipelinePCDMetadata?: PipelinePCDMetadata[];
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

  if (!pipelinePCDMetadata || pipelinePCDMetadata.length === 0) {
    return <div>No PCD metadata available for this pipeline.</div>;
  }

  return (
    <div>
      {pipelinePCDMetadata.map((metadata: PipelinePCDMetadata) => {
        const json = JSON.stringify(metadata, null, 2);
        return (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "12px",
              position: "relative"
            }}
            key={metadata.eventId}
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
            <code style={{ paddingTop: "0.5rem", display: "block" }}>
              {json}
            </code>
          </pre>
        );
      })}
    </div>
  );
}
