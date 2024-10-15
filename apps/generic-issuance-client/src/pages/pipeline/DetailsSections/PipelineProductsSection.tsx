import { Button, FormControl, HStack, Input, VStack } from "@chakra-ui/react";
import { CSVTicketPipelineDefinition } from "@pcd/passport-interface";
import { stringify as stringifyCSV } from "csv-stringify/sync";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { savePipeline } from "../../../helpers/Mutations";
import { useJWT } from "../../../helpers/userHooks";
import { parseCSV } from "../PipelineEditSection/parseCSV";

export function PipelineProductsSection({
  pipeline
}: {
  pipeline: CSVTicketPipelineDefinition;
}): ReactNode {
  const [inProgress, setInProgress] = useState(false);
  const userJWT = useJWT();

  const renameProduct = useCallback(
    async (oldName: string, newName: string) => {
      if (!userJWT) {
        alert("not logged in");
        return;
      }
      console.log(`Renaming product: ${oldName} to ${newName}`);
      const csv = pipeline.options.csv;
      const parsed = await parseCSV(csv);
      const newCsv = parsed.map((row) => {
        if (row[0] === oldName) {
          return [newName, ...row.slice(1)];
        }
        return row;
      });

      const pipelineCopy = structuredClone(pipeline);
      pipelineCopy.options.csv = stringifyCSV(newCsv);
      setInProgress(true);
      const res = await savePipeline(userJWT, JSON.stringify(pipelineCopy));

      if (res.success) {
        window.location.reload();
      } else {
        setInProgress(false);
        alert(res.error);
      }
    },
    [pipeline, userJWT]
  );

  const productNames = useMemo(() => {
    return Object.keys(pipeline.options.products);
  }, [pipeline.options.products]);

  return (
    <VStack spacing={2} w="100%" align="stretch">
      {Object.entries(pipeline.options.products).map(([product, id]) => (
        <ProductInput
          key={id}
          saveInProgress={inProgress}
          product={product}
          onSave={(newName) => {
            renameProduct(product, newName);
          }}
          productNames={productNames}
        />
      ))}
    </VStack>
  );
}

function ProductInput({
  product,
  onSave,
  saveInProgress,
  productNames
}: {
  product: string;
  onSave: (newName: string) => void;
  saveInProgress: boolean;
  productNames: string[];
}): ReactNode {
  const [newName, setNewName] = useState(product);
  const duplicate = useMemo(() => {
    return productNames.includes(newName);
  }, [productNames, newName]);

  const isInvalid = useMemo(() => {
    return newName.length === 0 || (duplicate && newName !== product);
  }, [newName, duplicate, product]);

  return (
    <HStack>
      <FormControl isInvalid={isInvalid}>
        <Input
          style={{
            borderColor: isInvalid ? "red" : undefined
          }}
          isInvalid={isInvalid}
          isDisabled={saveInProgress}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </FormControl>
      <Button
        isDisabled={saveInProgress || isInvalid || newName === product}
        ml={2}
        size="sm"
        colorScheme="blue"
        onClick={() => {
          onSave(newName);
        }}
      >
        Save
      </Button>
    </HStack>
  );
}
