import {
  PODPipelineInputFieldType,
  PODPipelineInputType,
  PODPipelineOptions,
  PODPipelinePCDTypes,
  validatePODPipelineOptions
} from "@pcd/passport-interface";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { step } from "mocha-steps";
import { v4 as uuidv4 } from "uuid";
import { CSVInput } from "../../../../src/services/generic-issuance/pipelines/PODPipeline/CSVInput";
import { PODPipeline } from "../../../../src/services/generic-issuance/pipelines/PODPipeline/PODPipeline";
import { expectToExist } from "../../../util/util";

describe("atom creation", function () {
  this.beforeAll(() => {
    use(chaiAsPromised);
  });

  step("atoms can be created", async function () {
    const pipelineId = uuidv4();
    const options: PODPipelineOptions = {
      input: {
        type: PODPipelineInputType.CSV,
        csv: "first_name,last_name,email\nJohn,Doe,john.doe@example.com\nJane,Doe,jane.doe@example.com",
        columns: {
          first_name: { type: PODPipelineInputFieldType.String },
          last_name: { type: PODPipelineInputFieldType.String },
          email: { type: PODPipelineInputFieldType.String }
        }
      },
      outputs: {
        output1: {
          entries: {
            first_name: {
              type: "string",
              source: { name: "first_name", type: "input" }
            },
            last_name: {
              type: "string",
              source: { name: "last_name", type: "input" }
            },
            email: { type: "string", source: { name: "email", type: "input" } }
          },
          pcdType: PODPipelinePCDTypes.PODPCD,
          match: {
            type: "email",
            inputField: "email"
          }
        }
      }
    };

    // This validation function would be run if we were parsing the options
    // from JSON when loading the pipeline.
    // It ensures that the output entries have valid input columns.
    expect(() => validatePODPipelineOptions(options)).to.not.throw();

    let input!: CSVInput;
    expect(() => (input = new CSVInput(options.input))).to.not.throw();
    expectToExist(input);
    expect(input.getRows()).to.eql([
      { first_name: "John", last_name: "Doe", email: "john.doe@example.com" },
      { first_name: "Jane", last_name: "Doe", email: "jane.doe@example.com" }
    ]);

    const atoms = PODPipeline.createAtoms(input, options.outputs, pipelineId);
    expect(atoms).to.have.lengthOf(2);
    const atom1 = atoms[0];
    expect(atom1.id).to.exist;
    expect(atom1.entries).to.eql({
      first_name: { type: "string", value: "John" },
      last_name: { type: "string", value: "Doe" },
      email: { type: "string", value: "john.doe@example.com" }
    });
    expect(atom1.outputId).to.eql("output1");
  });

  step("atoms can contain entries of different types", async function () {
    const pipelineId = uuidv4();
    const options: PODPipelineOptions = {
      input: {
        type: PODPipelineInputType.CSV,
        csv: "id,first_name,last_name,email,high_score,birthday,is_approved\n768dab50-2dea-4fd7-86bd-212f091b7867,John,Doe,john.doe@example.com,30,1980-01-01,true\nf1304eac-e462-4d8f-b704-9e7aed2e0618,Jane,Doe,jane.doe@example.com,25,1985-02-02,",
        columns: {
          id: { type: PODPipelineInputFieldType.UUID },
          first_name: { type: PODPipelineInputFieldType.String },
          last_name: { type: PODPipelineInputFieldType.String },
          email: { type: PODPipelineInputFieldType.String },
          high_score: { type: PODPipelineInputFieldType.Integer },
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
            email: { type: "string", source: { name: "email", type: "input" } },
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
            inputField: "email"
          }
        }
      }
    };

    // This validation function would be run if we were parsing the options
    // from JSON when loading the pipeline.
    // It ensures that the output entries have valid input columns.
    expect(() => validatePODPipelineOptions(options)).to.not.throw();

    let input!: CSVInput;
    expect(() => (input = new CSVInput(options.input))).to.not.throw();
    expectToExist(input);
    expect(input.getRows()).to.eql([
      {
        id: "768dab50-2dea-4fd7-86bd-212f091b7867",
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        high_score: 30n,
        birthday: new Date("1980-01-01"),
        is_approved: true
      },
      {
        id: "f1304eac-e462-4d8f-b704-9e7aed2e0618",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane.doe@example.com",
        high_score: 25n,
        birthday: new Date("1985-02-02"),
        is_approved: false
      }
    ]);

    const atoms = PODPipeline.createAtoms(input, options.outputs, pipelineId);
    expect(atoms).to.have.lengthOf(2);
    const atom1 = atoms[0];
    expect(atom1.id).to.exist;
    expect(atom1.entries).to.eql({
      id: { type: "string", value: "768dab50-2dea-4fd7-86bd-212f091b7867" },
      first_name: { type: "string", value: "John" },
      last_name: { type: "string", value: "Doe" },
      email: { type: "string", value: "john.doe@example.com" },
      high_score: { type: "int", value: 30n },
      birthday: {
        type: "int",
        value: BigInt(new Date("1980-01-01").getTime())
      },
      is_approved: { type: "int", value: 1n }
    });
    expect(atom1.outputId).to.eql("output1");
  });
});
