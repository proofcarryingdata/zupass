import { Box, Button, Link, Stack } from "@chakra-ui/react";
import { ReactNode } from "react";
import { Link as ReactLink } from "react-router-dom";

export function CreatePipelineButtonSection(): ReactNode {
  return (
    <div>
      <Stack overflow="hidden" padding={4} gap={4}>
        <Box display="inline-block">
          <Box float="right">
            <Link as={ReactLink} href="/create-pipeline">
              <Button colorScheme="green" size="sm">
                Create Pipeline
              </Button>
            </Link>
          </Box>
        </Box>
      </Stack>
    </div>
  );
}
