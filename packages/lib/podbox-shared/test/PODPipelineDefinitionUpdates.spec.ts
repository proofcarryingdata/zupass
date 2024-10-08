import {
  PODPipelineDefinition,
  PODPipelineDefinitionSchema,
  PODPipelineInputFieldType,
  PODPipelineInputType,
  PODPipelinePCDTypes,
  PipelineType
} from "@pcd/passport-interface";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import {
  addInputColumn,
  addOutputEntry,
  changeOutputEntryName,
  changeOutputEntryType,
  deleteInputColumn,
  deleteOutputEntry,
  parseCSV,
  renameInputColumn
} from "../src/PODPipeline/updates";

use(chaiAsPromised);

const sampleDefinition: PODPipelineDefinition = {
  type: PipelineType.POD,
  id: uuidv4(),
  ownerUserId: uuidv4(),
  editorUserIds: [uuidv4()],
  timeCreated: "2024-01-01",
  timeUpdated: "2024-01-01",
  options: {
    input: {
      type: PODPipelineInputType.CSV,
      csv: "id,first_name,last_name,email,high_score,birthday,is_approved\n768dab50-2dea-4fd7-86bd-212f091b7867,John,Doe,john.doe@example.com,30,1980-01-01,true\nf1304eac-e462-4d8f-b704-9e7aed2e0618,Jane,Doe,jane.doe@example.com,25,1985-02-02,",
      columns: {
        id: { type: PODPipelineInputFieldType.UUID },
        first_name: { type: PODPipelineInputFieldType.String },
        last_name: { type: PODPipelineInputFieldType.String },
        email: { type: PODPipelineInputFieldType.String },
        high_score: { type: PODPipelineInputFieldType.Int },
        birthday: { type: PODPipelineInputFieldType.Date },
        is_approved: { type: PODPipelineInputFieldType.Boolean }
      }
    },
    outputs: {
      output1: {
        entries: {
          id: {
            type: "string",
            source: { name: "id", type: "input" }
          },
          first_name: {
            type: "string",
            source: { name: "first_name", type: "input" }
          },
          last_name: {
            type: "string",
            source: { name: "last_name", type: "input" }
          },
          email: {
            type: "string",
            source: { name: "email", type: "input" }
          },
          high_score: {
            type: "int",
            source: { name: "high_score", type: "input" }
          },
          birthday: {
            type: "int",
            source: { name: "birthday", type: "input" }
          },
          is_approved: {
            type: "int",
            source: { name: "is_approved", type: "input" }
          }
        },
        pcdType: PODPipelinePCDTypes.PODPCD,
        match: {
          type: "email",
          entry: "email"
        }
      }
    },
    feedOptions: {
      feedId: "feedId",
      feedDisplayName: "feedDisplayName",
      feedDescription: "feedDescription",
      feedFolder: "feedFolder",
      feedType: "deleteAndReplace"
    }
  }
};

describe("PODPipelineDefinition updates", () => {
  it("can rename input columns", () => {
    const definition = renameInputColumn(
      sampleDefinition,
      "first_name",
      "firstName",
      parseCSV(
        sampleDefinition.options.input.csv,
        sampleDefinition.options.input.columns
      )
    );
    expect(definition.options.input.columns.first_name).to.not.exist;
    expect(definition.options.input.columns.firstName).to.exist;
    expect(PODPipelineDefinitionSchema.safeParse(definition).success).to.be
      .true;
  });

  it("can add input columns", () => {
    const definition = addInputColumn(
      sampleDefinition,
      "new_column",
      PODPipelineInputFieldType.String,
      parseCSV(
        sampleDefinition.options.input.csv,
        sampleDefinition.options.input.columns
      )
    );
    expect(definition.options.input.columns.new_column).to.exist;
    expect(PODPipelineDefinitionSchema.safeParse(definition).success).to.be
      .true;
  });

  it("can delete input columns", () => {
    const definition = deleteInputColumn(
      sampleDefinition,
      "first_name",
      parseCSV(
        sampleDefinition.options.input.csv,
        sampleDefinition.options.input.columns
      )
    );
    expect(definition.options.input.columns.first_name).to.not.exist;
    expect(PODPipelineDefinitionSchema.safeParse(definition).success).to.be
      .true;
  });

  it("can add output entries", () => {
    const definition = addOutputEntry(sampleDefinition, "output1");
    expect(definition.options.outputs.output1.entries.new_entry).to.exist;
    expect(PODPipelineDefinitionSchema.safeParse(definition).success).to.be
      .true;
  });

  it("can delete output entries", () => {
    const definition1 = addOutputEntry(sampleDefinition, "output1");
    expect(definition1.options.outputs.output1.entries.new_entry).to.exist;
    const definition2 = deleteOutputEntry(definition1, "output1", "new_entry");
    expect(definition2.options.outputs.output1.entries.new_entry).to.not.exist;
    expect(PODPipelineDefinitionSchema.safeParse(definition2).success).to.be
      .true;
  });

  it("can change output entry type", () => {
    const definition1 = addOutputEntry(sampleDefinition, "output1");
    expect(definition1.options.outputs.output1.entries.new_entry).to.exist;
    const definition2 = changeOutputEntryType(
      definition1,
      "output1",
      "new_entry",
      "int"
    );
    expect(definition2.options.outputs.output1.entries.new_entry.type).to.equal(
      "int"
    );
    expect(PODPipelineDefinitionSchema.safeParse(definition2).success).to.be
      .true;
  });

  it("can change output entry name", () => {
    const definition1 = addOutputEntry(sampleDefinition, "output1");
    expect(definition1.options.outputs.output1.entries.new_entry).to.exist;
    const definition2 = changeOutputEntryName(
      definition1,
      "output1",
      "new_entry",
      "new_name"
    );
    expect(definition2.options.outputs.output1.entries.new_entry).to.not.exist;
    expect(definition2.options.outputs.output1.entries.new_name).to.exist;
    expect(PODPipelineDefinitionSchema.safeParse(definition2).success).to.be
      .true;
  });
});
