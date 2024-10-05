import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { getLastValidVerifyUrl } from "../src/util";

describe("util", async function () {
  const mockOrigin = "https://zupass.org";
  const verifyUrl = `${mockOrigin}/#/verify?id=asdf`;
  const checkinUrl = `${mockOrigin}/#/checkin?id=asdf`;
  const checkinByIdUrl = `${mockOrigin}/#/checkin-by-id?id=asdf`;
  const otherZupassUrl = `${mockOrigin}/#/login`;

  beforeEach(() => {
    Object.defineProperty(global, "window", {
      value: {
        location: {
          origin: mockOrigin
        }
      },
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(global, "window", {
      value: { location: undefined }
    });
  });

  it("getLastValidVerifyUrl: function works as intended", function () {
    assert.equal(getLastValidVerifyUrl(""), null);
    assert.equal(getLastValidVerifyUrl(`${otherZupassUrl}`), null);
    assert.equal(getLastValidVerifyUrl(`${verifyUrl}`), verifyUrl);
    assert.equal(getLastValidVerifyUrl(`asdf${verifyUrl}`), verifyUrl);
    assert.equal(
      getLastValidVerifyUrl(`asdf${verifyUrl}${verifyUrl}`),
      verifyUrl
    );
    assert.equal(
      getLastValidVerifyUrl(
        `...${otherZupassUrl}${checkinByIdUrl}${verifyUrl}`
      ),
      verifyUrl
    );
    assert.equal(
      getLastValidVerifyUrl(
        `${otherZupassUrl}${checkinByIdUrl}zxvc${checkinByIdUrl}`
      ),
      checkinByIdUrl
    );
    assert.equal(
      getLastValidVerifyUrl(`${checkinByIdUrl}${otherZupassUrl}${checkinUrl}`),
      checkinUrl
    );
  });
});
