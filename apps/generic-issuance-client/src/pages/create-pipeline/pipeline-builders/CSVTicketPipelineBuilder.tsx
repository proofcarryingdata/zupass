import {
  Box,
  Button,
  Card,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Tag,
  TagCloseButton,
  TagLabel,
  VStack
} from "@chakra-ui/react";
import {
  CSVTicketPipelineDefinition,
  PipelineType
} from "@pcd/passport-interface";
import uniq from "lodash/uniq";
import { ReactNode, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { FancyEditor } from "../../../components/FancyEditor";
import {
  CSVPreview,
  PreviewType
} from "../../pipeline/PipelineEditSection/CSVPreview";
import { TwoColumns } from "../../pipeline/PipelinePage";

interface CSVTicketPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

const SAMPLE_PRODUCTS = ["General Admission", "Speaker"];

const SAMPLE_CSV_DATA = `Ticket Type,Attendee Name,Attendee Email,Image URL
"${SAMPLE_PRODUCTS[0]}",John Doe,john.doe@example.com,https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Europe_map.png/598px-Europe_map.png
"${SAMPLE_PRODUCTS[1]}",Jane Doe,jane.doe@example.com,https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Europe_map.png/598px-Europe_map.png`;

export default function CSVTicketPipelineBuilder(
  props: CSVTicketPipelineBuilderProps
): ReactNode {
  const [eventName, setEventName] = useState("My Event");
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [newProduct, setNewProduct] = useState("");
  const [csv, setCsv] = useState(SAMPLE_CSV_DATA);

  const [previewType, setPreviewType] = useState<PreviewType | undefined>(
    PreviewType.CSVSheet
  );

  return (
    <>
      <TwoColumns
        style={{
          gap: "8px",
          height: "100%",
          justifyContent: "space-between",
          alignItems: "stretch"
        }}
      >
        <div
          className="col1"
          style={{ minWidth: "fit-content", width: "fit-content", flexGrow: 0 }}
        >
          <Card overflow="hidden" width="fit-content">
            <Box maxW="800px" minW="800px" height="500px">
              {previewType === undefined && (
                <FancyEditor
                  editorStyle={{ height: "500px", width: "800px" }}
                  dark
                  value={csv}
                  setValue={setCsv}
                />
              )}
              {previewType !== undefined && (
                <CSVPreview
                  csv={csv}
                  previewType={previewType}
                  onChange={setCsv}
                />
              )}
            </Box>
          </Card>
          <HStack mt={2} minWidth="fit-content" width="fit-content">
            <Button
              flexShrink={0}
              disabled={previewType === undefined}
              colorScheme={previewType === undefined ? "blue" : undefined}
              onClick={(): void => setPreviewType(undefined)}
            >
              CSV
            </Button>

            <Button
              flexShrink={0}
              disabled={previewType === PreviewType.CSVSheet}
              colorScheme={
                previewType === PreviewType.CSVSheet ? "blue" : undefined
              }
              onClick={(): void => setPreviewType(PreviewType.CSVSheet)}
            >
              Preview
            </Button>
          </HStack>
        </div>
        <div
          className="col2"
          style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
        >
          <Card padding={6} flexGrow="1" minW="400px">
            <FormControl mb={4}>
              <FormLabel>Event Name</FormLabel>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Event Name"
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Products</FormLabel>
              <VStack align="stretch" spacing={2}>
                {products.map((product, index) => (
                  <HStack key={index}>
                    <Tag size="lg">
                      <TagLabel>{product}</TagLabel>
                      <TagCloseButton
                        aria-label="Delete product  "
                        onClick={() =>
                          setProducts(products.filter((_, i) => i !== index))
                        }
                      />
                    </Tag>
                  </HStack>
                ))}
                <HStack>
                  <Input
                    placeholder="New product name"
                    value={newProduct}
                    onChange={(e) => setNewProduct(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (newProduct.trim()) {
                        setProducts(uniq([...products, newProduct.trim()]));
                        setNewProduct("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </HStack>
              </VStack>
            </FormControl>
          </Card>

          <Button
            mt={2}
            width="100px"
            maxW="100px"
            colorScheme="green"
            onClick={(): Promise<void> =>
              props.onCreate(
                JSON.stringify({
                  type: PipelineType.CSVTicket,
                  timeCreated: new Date().toISOString(),
                  timeUpdated: new Date().toISOString(),
                  editorUserIds: [],
                  options: {
                    eventName,
                    products: Object.fromEntries(
                      products.map((productName) => [productName, uuidv4()])
                    ),
                    pcdTypes: ["EdDSATicketPCD", "PODTicketPCD"],
                    csv,
                    feedOptions: {
                      feedId: `tickets`,
                      feedDisplayName: `${eventName} Tickets`,
                      feedDescription: `Tickets for ${eventName}`,
                      feedFolder: eventName
                    },
                    name: eventName
                  }
                } satisfies Partial<CSVTicketPipelineDefinition>)
              )
            }
          >
            Create
          </Button>
        </div>
      </TwoColumns>
    </>
  );
}
