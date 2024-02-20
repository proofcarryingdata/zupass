import { Card, FormControl, FormLabel, Input } from "@chakra-ui/react";
import { FeedIssuanceOptions } from "@pcd/passport-interface";
import { ChangeEvent } from "react";
import styled from "styled-components";

interface FeedOptionsProps {
  feedOptions: FeedIssuanceOptions;
  setFeedOptions: (options: FeedIssuanceOptions) => void;
}

export const FeedOptions: React.FC<FeedOptionsProps> = ({
  feedOptions,
  setFeedOptions
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setFeedOptions({
      ...feedOptions,
      [name]: value
    });
  };

  return (
    <Card padding={6} maxWidth={480} height={"100%"}>
      <FormControl mb={4}>
        <FormLabel>Zupass Feed Display Name</FormLabel>
        <Input
          width="100%"
          type="text"
          id="feedDisplayName"
          name="feedDisplayName"
          value={feedOptions.feedDisplayName}
          onChange={handleChange}
        />
      </FormControl>

      <FormControl mb={4}>
        <FormLabel>Zupass Feed Description</FormLabel>
        <Input
          width="100%"
          type="text"
          id="feedDescription"
          name="feedDescription"
          value={feedOptions.feedDescription}
          onChange={handleChange}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Feed Folder</FormLabel>
        <Input
          width="100%"
          type="text"
          id="feedFolder"
          name="feedFolder"
          value={feedOptions.feedFolder}
          onChange={handleChange}
        />
      </FormControl>
    </Card>
  );
};

const FeedOptionsTable = styled.table`
  tbody {
    tr {
      td:first-child {
        text-align: right;
        padding-right: 16px;
        width: 200px;
      }
    }
  }
`;
