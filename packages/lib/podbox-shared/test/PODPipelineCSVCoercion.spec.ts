import { PODPipelineInputFieldType } from "@pcd/passport-interface";
import {
  POD_CRYPTOGRAPHIC_MAX,
  POD_CRYPTOGRAPHIC_MIN,
  POD_INT_MAX,
  POD_INT_MIN
} from "@pcd/pod";
import { assert, expect } from "chai";
import "mocha";
import { coercions } from "../src/PODPipeline/coercion";

describe("PODPipeline input type coercions", () => {
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

  it("will normalize UUIDs to lowercase", () => {
    {
      const uuid = "123e4567-e89b-12d3-a456-426655440000";
      const result = coercions[PODPipelineInputFieldType.UUID](uuid);
      assert(result.success === true);
      // The parsed UUID is the same as the original string
      expect(result.data).to.eql("123e4567-e89b-12d3-a456-426655440000");
    }
    {
      const uuid = "123E4567-E89B-12D3-A456-426655440000";
      const result = coercions[PODPipelineInputFieldType.UUID](uuid);
      assert(result.success === true);
      // The parsed UUID is not the same as the original string
      expect(result.data).to.not.eql("123E4567-E89B-12D3-A456-426655440000");
      expect(result.data.toLowerCase()).to.eql(
        "123e4567-e89b-12d3-a456-426655440000"
      );
    }
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

  it("can coerce strings to integers", () => {
    const result = coercions[PODPipelineInputFieldType.Int]("123");
    assert(result.success === true);
    expect(result.data).to.eql(123n);
  });

  it("will reject non-numeric strings", () => {
    const result = coercions[PODPipelineInputFieldType.Int]("not a number");
    assert(result.success === false);
    expect(result.error.errors).to.eql([
      { code: "custom", message: "Invalid BigInt value", path: [], fatal: true }
    ]);
  });

  it("will reject out-of-bounds integers", () => {
    {
      const result = coercions[PODPipelineInputFieldType.Int](
        (POD_INT_MAX + 1n).toString()
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
      const result = coercions[PODPipelineInputFieldType.Int](
        (POD_INT_MIN - 1n).toString()
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

  it("can coerce strings to cryptographic numbers", () => {
    const result = coercions[PODPipelineInputFieldType.Cryptographic]("123");
    assert(result.success === true);
    expect(result.data).to.eql(123n);
  });

  it("can coerce strings to cryptographic numbers when such numbers would be out-of-bounds as integers", () => {
    const result = coercions[PODPipelineInputFieldType.Cryptographic](
      (POD_INT_MAX + 1n).toString()
    );
    assert(result.success === true);
    expect(result.data).to.eql(POD_INT_MAX + 1n);
  });

  it("will reject out-of-bounds cryptographic numbers", () => {
    {
      const result = coercions[PODPipelineInputFieldType.Cryptographic](
        (POD_CRYPTOGRAPHIC_MAX + 1n).toString()
      );
      assert(result.success === false);
      expect(result.error.errors).to.eql([
        {
          code: "custom",
          message:
            "Cryptographic number must be between POD_CRYPTOGRAPHIC_MIN and POD_CRYPTOGRAPHIC_MAX, inclusive",
          path: []
        }
      ]);
    }
    {
      const result = coercions[PODPipelineInputFieldType.Cryptographic](
        (POD_CRYPTOGRAPHIC_MIN - 1n).toString()
      );
      assert(result.success === false);
      expect(result.error.errors).to.eql([
        {
          code: "custom",
          message:
            "Cryptographic number must be between POD_CRYPTOGRAPHIC_MIN and POD_CRYPTOGRAPHIC_MAX, inclusive",
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
