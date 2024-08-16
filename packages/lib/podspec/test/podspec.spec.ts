import { POD, POD_INT_MAX } from "@pcd/pod";
import { assert, expect } from "chai";
import crypto from "crypto";
import "mocha";
import { p } from "../src/index";

function generateRandomHex(byteLength: number): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return randomBytes.toString("hex");
}

describe("podspec should work", async function () {
  it("podspec should do something", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.string(),
      bar: p.coerce.integer()
    });

    const result = myPodSpec.safeParse({
      foo: "test",
      bar: 1
    });
    expect(result.status).to.eq("valid");
    assert(result.status === "valid");
    expect(result.value.foo.value).to.eq("test");
    expect(result.value.bar.value).to.eq(1n);
  });

  it("podspec should fail with bad inputs", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.string(),
      bar: p.coerce.integer()
    });

    const result = myPodSpec.safeParse({
      foo: "test",
      bar: POD_INT_MAX + 1n
    });
    expect(result.status).to.eq("invalid");
  });

  it("podspec should match on tuples", function () {
    const myPodSpec = p
      .entries({
        foo: p.coerce.string(),
        bar: p.coerce.integer()
      })
      .matchTuple({
        name: "test",
        exclude: false,
        entries: ["foo", "bar"],
        members: [
          [
            { type: "string", value: "test" },
            { type: "int", value: 1n }
          ]
        ]
      });

    {
      const result = myPodSpec.safeParse({
        foo: "test",
        bar: 1n
      });
      expect(result.status).to.eq("valid");
    }
    {
      const result = myPodSpec.safeParse({
        foo: "other string",
        bar: 1n
      });
      expect(result.status).to.eq("invalid");
    }
  });

  it("podspec should serialize", function () {
    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.integer()
    });

    expect(myPodSpec.serialize()).to.eql({
      foo: { type: "string", checks: [], coerce: false },
      bar: { type: "int", checks: [], coerce: false }
    });
  });

  it("should query", function () {
    const key = generateRandomHex(32);

    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.integer()
    });

    const pods = [
      POD.sign(
        {
          foo: { type: "string", value: "just a string" }
        },
        key
      ),
      POD.sign(
        {
          foo: { type: "string", value: "test" },
          bar: { type: "int", value: 1n }
        },
        key
      )
    ];

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches[0]).to.eq(pods[1]);
    expect(queryResult.matchingIndexes).to.eql([1]);
  });
});
