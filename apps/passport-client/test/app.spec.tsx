import { render } from "@testing-library/react";
import "global-jsdom/register";
import "mocha";
import { App } from "../pages/app";
import { MockServerAPI } from "./api/mockServerApi";

describe("application", async function () {
  const mockApi = new MockServerAPI();

  it("should work", async function () {
    const { container } = render(<App api={mockApi} />);
    console.log(container);
  });
});
