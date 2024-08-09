import {
  PODPipelineCSVInput,
  PODPipelineInputFieldType,
  PODPipelineInputType
} from "@pcd/passport-interface";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { CSVInput, CSVInputError } from "../src/PODPipeline/CSVInput";

describe("input loading", function () {
  this.beforeAll(() => {
    use(chaiAsPromised);
  });

  it("CSV input can be loaded", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: [
        "first_name,last_name,email",
        "John,Doe,john.doe@example.com",
        "Jane,Doe,jane.doe@example.com"
      ].join("\n"),
      columns: {
        first_name: { type: PODPipelineInputFieldType.String },
        last_name: { type: PODPipelineInputFieldType.String },
        email: { type: PODPipelineInputFieldType.String }
      }
    };

    let input!: CSVInput;
    expect(
      () => (input = CSVInput.fromConfiguration(inputOptions))
    ).to.not.throw();
    expect(input).to.exist;
    expect(input.getRows()).to.eql([
      { first_name: "John", last_name: "Doe", email: "john.doe@example.com" },
      { first_name: "Jane", last_name: "Doe", email: "jane.doe@example.com" }
    ]);
  });

  it("CSV inputs with more complex types can be loaded", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: [
        "id,first_name,last_name,email,birthday,high_score",
        "768dab50-2dea-4fd7-86bd-212f091b7867,John,Doe,john.doe@example.com,1980-01-01,100",
        "f1304eac-e462-4d8f-b704-9e7aed2e0618,Jane,Doe,jane.doe@example.com,1980-01-02,200"
      ].join("\n"),
      columns: {
        id: { type: PODPipelineInputFieldType.UUID },
        first_name: { type: PODPipelineInputFieldType.String },
        last_name: { type: PODPipelineInputFieldType.String },
        email: { type: PODPipelineInputFieldType.String },
        birthday: { type: PODPipelineInputFieldType.Date },
        high_score: { type: PODPipelineInputFieldType.Int }
      }
    };

    let input!: CSVInput;
    expect(
      () => (input = CSVInput.fromConfiguration(inputOptions))
    ).to.not.throw();
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
      csv: ["name,age", "John,31.45", "Jane, 42"].join("\n"),
      columns: {
        name: { type: PODPipelineInputFieldType.String },
        age: { type: PODPipelineInputFieldType.Int }
      }
    };

    expect(() => CSVInput.fromConfiguration(inputOptions))
      .to.throw(CSVInputError)
      .with.property("errors")
      .eql([
        {
          row: 0,
          column: "age",
          value: "31.45",
          errors: [
            {
              code: "custom",
              message: "Invalid BigInt value",
              fatal: true,
              path: []
            }
          ]
        }
      ]);
  });

  it("invalid date inputs will cause errors", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: ["name,birthday", "John,foo", "Jane,1980-01-02"].join("\n"),
      columns: {
        name: { type: PODPipelineInputFieldType.String },
        birthday: { type: PODPipelineInputFieldType.Date }
      }
    };

    expect(() => CSVInput.fromConfiguration(inputOptions))
      .to.throw(CSVInputError)
      .with.property("errors")
      .eql([
        {
          row: 0,
          column: "birthday",
          value: "foo",
          errors: [{ code: "invalid_date", message: "Invalid date", path: [] }]
        }
      ]);
  });

  it("invalid UUID inputs will cause errors", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: [
        "id,name,birthday",
        "00000000-0000-0000-0000-000000000000,John,1980-01-01",
        "foo,Jane,1980-01-02"
      ].join("\n"),
      columns: {
        id: { type: PODPipelineInputFieldType.UUID },
        name: { type: PODPipelineInputFieldType.String },
        birthday: { type: PODPipelineInputFieldType.Date }
      }
    };

    expect(() => CSVInput.fromConfiguration(inputOptions))
      .to.throw(CSVInputError)
      .with.property("errors")
      .eql([
        {
          row: 1,
          column: "id",
          value: "foo",
          errors: [
            {
              code: "invalid_string",
              message: "Invalid uuid",
              path: [],
              validation: "uuid"
            }
          ]
        }
      ]);
  });

  it("multiple errors will be reported", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: [
        "id,name,birthday,high_score",
        "00000000-0000-0000-0000-000000000000,John,1980-01-01,x",
        "foo,Jane,,200"
      ].join("\n"),
      columns: {
        id: { type: PODPipelineInputFieldType.UUID },
        name: { type: PODPipelineInputFieldType.String },
        birthday: { type: PODPipelineInputFieldType.Date },
        high_score: { type: PODPipelineInputFieldType.Int }
      }
    };

    expect(() => CSVInput.fromConfiguration(inputOptions))
      .to.throw(CSVInputError)
      .with.property("errors")
      .eql([
        {
          row: 0,
          column: "high_score",
          value: "x",
          errors: [
            {
              code: "custom",
              message: "Invalid BigInt value",
              path: [],
              fatal: true
            }
          ]
        },
        {
          row: 1,
          column: "id",
          value: "foo",
          errors: [
            {
              code: "invalid_string",
              message: "Invalid uuid",
              path: [],
              validation: "uuid"
            }
          ]
        },
        {
          row: 1,
          column: "birthday",
          value: "",
          errors: [{ code: "invalid_date", message: "Invalid date", path: [] }]
        }
      ]);
  });

  it("mismatch between CSV columns and configured columns will cause an error", async function () {
    const inputOptions: PODPipelineCSVInput = {
      type: PODPipelineInputType.CSV,
      csv: "id,name,birthday,high_score\n00000000-0000-0000-0000-000000000000,John,1980-01-01,x\nfoo,Jane,,200",
      columns: {
        id: { type: PODPipelineInputFieldType.UUID },
        name: { type: PODPipelineInputFieldType.String },
        // Renamed column which does not match the CSV header
        joining_date: { type: PODPipelineInputFieldType.Date },
        high_score: { type: PODPipelineInputFieldType.Int }
      }
    };

    expect(() => CSVInput.fromConfiguration(inputOptions)).to.throw(
      "CSV header does not match configured columns"
    );
  });
});
