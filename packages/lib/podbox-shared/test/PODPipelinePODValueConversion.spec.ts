import { PODPipelineInputFieldType } from "@pcd/passport-interface";
import { uuidToBigInt } from "@pcd/util";
import { assert, expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { getInputToPODValueConverter } from "../src/PODPipeline/inputToPODEntries";

describe("PODPipelineDefinition updates", () => {
  it("can convert string input fields to POD strings", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.String,
      "string"
    );
    assert(converter);
    const result = converter("hello");
    expect(result).to.eql({
      type: "string",
      value: "hello"
    });
  });

  it("can convert integer input fields to POD strings", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.Integer,
      "string"
    );
    assert(converter);
    const result = converter(500n);
    expect(result).to.eql({
      type: "string",
      value: "500"
    });
  });

  it("can convert boolean input fields to POD strings", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.Boolean,
      "string"
    );
    assert(converter);
    const result = converter(true);
    expect(result).to.eql({
      type: "string",
      value: "true"
    });
  });

  it("can convert date input fields to POD strings", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.Date,
      "string"
    );
    assert(converter);
    const result = converter(new Date("2021-01-01"));
    expect(result).to.eql({
      type: "string",
      value: "2021-01-01T00:00:00.000Z"
    });
  });

  it("can convert UUID fields to POD strings", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.UUID,
      "string"
    );
    assert(converter);
    const uuid = uuidv4();
    const result = converter(uuid);
    expect(result).to.eql({
      type: "string",
      value: uuid
    });
  });

  it("can convert integer fields to POD integers", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.Integer,
      "int"
    );
    assert(converter);
    const result = converter(500n);
    expect(result).to.eql({
      type: "int",
      value: 500n
    });
  });

  it("can convert date fields to POD integers", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.Date,
      "int"
    );
    assert(converter);
    const result = converter(new Date("2021-01-01"));
    expect(result).to.eql({
      type: "int",
      value: 1609459200000n
    });
  });

  it("can convert boolean fields to POD integers", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.Boolean,
      "int"
    );
    assert(converter);
    const result = converter(true);
    expect(result).to.eql({
      type: "int",
      value: 1n
    });
  });

  it("can convert integer fields to POD cryptographics", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.Integer,
      "cryptographic"
    );
    assert(converter);
    const result = converter(500n);
    expect(result).to.eql({
      type: "cryptographic",
      value: 500n
    });
  });

  it("can convert date fields to POD cryptographics", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.Date,
      "cryptographic"
    );
    assert(converter);
    const result = converter(new Date("2021-01-01"));
    expect(result).to.eql({
      type: "cryptographic",
      value: 1609459200000n
    });
  });

  it("can convert boolean fields to POD cryptographics", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.Boolean,
      "cryptographic"
    );
    assert(converter);
    const result = converter(true);
    expect(result).to.eql({
      type: "cryptographic",
      value: 1n
    });
  });

  it("can convert UUID fields to POD cryptographics", () => {
    const converter = getInputToPODValueConverter(
      PODPipelineInputFieldType.UUID,
      "cryptographic"
    );
    assert(converter);
    const uuid = uuidv4();
    const result = converter(uuid);
    expect(result).to.eql({
      type: "cryptographic",
      value: uuidToBigInt(uuid)
    });
  });
});
