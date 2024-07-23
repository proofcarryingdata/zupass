import { assert, expect } from "chai";
import "mocha";
import { coercions } from "../src/PODPipeline/coercion";
import { PODPipelineInputFieldType } from "../src/genericIssuanceTypes";

describe("PODPipelineDefinition updates", () => {
  it("can coerce strings to UUIDs", () => {
    const uuid = "123e4567-e89b-12d3-a456-426655440000";
    const result = coercions[PODPipelineInputFieldType.UUID](uuid);
    assert(result.success === true);
    // The parsed UUID is the same as the original string
    expect(result.data).to.eql("123e4567-e89b-12d3-a456-426655440000");
  });

  it("will reject malformed UUIDs", () => {
    const uuid = "sdf99232332ksdfs";
    const result = coercions[PODPipelineInputFieldType.UUID](uuid);
    assert(result.success === false);
    expect(result.error.errors).to.eql([
      {
        code: "invalid_string",
        message: "Invalid uuid",
        validation: "uuid",
        path: []
      }
    ]);
  });

  it("can coerce strings to booleans", () => {
    {
      const result = coercions[PODPipelineInputFieldType.Boolean]("true");
      assert(result.success === true);
      expect(result.data).to.eql(true);
    }
    {
      const result = coercions[PODPipelineInputFieldType.Boolean]("false");
      assert(result.success === true);
      expect(result.data).to.eql(false);
    }
    {
      const result = coercions[PODPipelineInputFieldType.Boolean]("0");
      assert(result.success === true);
      expect(result.data).to.eql(false);
    }
    {
      const result = coercions[PODPipelineInputFieldType.Boolean]("1");
      assert(result.success === true);
      expect(result.data).to.eql(true);
    }
    {
      // Empty strings are false
      const result = coercions[PODPipelineInputFieldType.Boolean]("0");
      assert(result.success === true);
      expect(result.data).to.eql(false);
    }
  });

  it("will reject non-boolean strings", () => {
    const result =
      coercions[PODPipelineInputFieldType.Boolean]("not a boolean");
    assert(result.success === false);
    expect(result.error.errors).to.eql([
      {
        code: "custom",
        message: "Invalid boolean value",
        path: []
      }
    ]);
  });

  it("can coerce strings to numbers", () => {
    const result = coercions[PODPipelineInputFieldType.Integer]("123");
    assert(result.success === true);
    expect(result.data).to.eql(123n);
  });

  it("will reject non-numeric strings", () => {
    const result = coercions[PODPipelineInputFieldType.Integer]("not a number");
    assert(result.success === false);
    expect(result.error.errors).to.eql([
      { code: "custom", message: "Invalid BigInt value", path: [], fatal: true }
    ]);
  });

  it("will reject out-of-bounds integers", () => {
    {
      const result = coercions[PODPipelineInputFieldType.Integer](
        (BigInt(1) << BigInt(64)).toString()
      );
      assert(result.success === false);
      expect(result.error.errors).to.eql([
        {
          code: "custom",
          message:
            "Integer must be between POD_INT_MIN and POD_INT_MAX, inclusive",
          path: []
        }
      ]);
    }
    {
      const result = coercions[PODPipelineInputFieldType.Integer](
        BigInt(-1).toString()
      );
      assert(result.success === false);
      expect(result.error.errors).to.eql([
        {
          code: "custom",
          message:
            "Integer must be between POD_INT_MIN and POD_INT_MAX, inclusive",
          path: []
        }
      ]);
    }
  });

  it("can coerce strings to dates", () => {
    const result = coercions[PODPipelineInputFieldType.Date]("2021-01-01");
    assert(result.success === true);
    expect(result.data).to.eql(new Date("2021-01-01"));
  });

  it("will reject malformed dates", () => {
    const result = coercions[PODPipelineInputFieldType.Date]("not a date");
    assert(result.success === false);
    expect(result.error.errors).to.eql([
      { code: "invalid_date", message: "Invalid date", path: [] }
    ]);
  });
});
