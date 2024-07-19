import {
  CSVInput,
  PODPipelineCSVInput,
  PODPipelineInputFieldType,
  PODPipelineInputType
} from "@pcd/passport-interface";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";

describe("input loading", function () {
  this.beforeAll(() => {
    use(chaiAsPromised);
  });

  it("CSV input can be loaded", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: "first_name,last_name,email\nJohn,Doe,john.doe@example.com\nJane,Doe,jane.doe@example.com",
      columns: {
        first_name: { type: PODPipelineInputFieldType.String },
        last_name: { type: PODPipelineInputFieldType.String },
        email: { type: PODPipelineInputFieldType.String }
      }
    };

    let input!: CSVInput;
    expect(() => (input = new CSVInput(inputOptions))).to.not.throw();
    expect(input).to.exist;
    expect(input.getRows()).to.eql([
      { first_name: "John", last_name: "Doe", email: "john.doe@example.com" },
      { first_name: "Jane", last_name: "Doe", email: "jane.doe@example.com" }
    ]);
  });

  it("CSV inputs with more complex types can be loaded", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: "id,first_name,last_name,email,birthday,high_score\n768dab50-2dea-4fd7-86bd-212f091b7867,John,Doe,john.doe@example.com,1980-01-01,100\nf1304eac-e462-4d8f-b704-9e7aed2e0618,Jane,Doe,jane.doe@example.com,1980-01-02,200",
      columns: {
        id: { type: PODPipelineInputFieldType.UUID },
        first_name: { type: PODPipelineInputFieldType.String },
        last_name: { type: PODPipelineInputFieldType.String },
        email: { type: PODPipelineInputFieldType.String },
        birthday: { type: PODPipelineInputFieldType.Date },
        high_score: { type: PODPipelineInputFieldType.Integer }
      }
    };

    let input!: CSVInput;
    expect(() => (input = new CSVInput(inputOptions))).to.not.throw();
    expect(input).to.exist;
    expect(input.getRows()).to.eql([
      {
        id: "768dab50-2dea-4fd7-86bd-212f091b7867",
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        birthday: new Date("1980-01-01"),
        high_score: 100n
      },
      {
        id: "f1304eac-e462-4d8f-b704-9e7aed2e0618",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane.doe@example.com",
        birthday: new Date("1980-01-02"),
        high_score: 200n
      }
    ]);
  });

  it("invalid integer inputs will cause errors", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: "name,age\nJohn, 31.45\nJane, 42",
      columns: {
        name: { type: PODPipelineInputFieldType.String },
        age: { type: PODPipelineInputFieldType.Integer }
      }
    };

    expect(() => new CSVInput(inputOptions)).to.throw(
      JSON.stringify(
        [
          {
            code: "custom",
            message: "Invalid BigInt value",
            fatal: true,
            path: ["age"]
          }
        ],
        null,
        2
      )
    );
  });

  it("invalid date inputs will cause errors", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: "name,birthday\nJohn, foo\nJane, 1980-01-02",
      columns: {
        name: { type: PODPipelineInputFieldType.String },
        birthday: { type: PODPipelineInputFieldType.Date }
      }
    };

    expect(() => new CSVInput(inputOptions)).to.throw(
      JSON.stringify(
        [
          {
            code: "invalid_date",
            path: ["birthday"],
            message: "Invalid date"
          }
        ],
        null,
        2
      )
    );
  });
});
