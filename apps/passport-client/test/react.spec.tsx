import { render } from "@testing-library/react";
import { expect } from "chai";
import "global-jsdom/register";
import "mocha";

function Greeting() {
  return <div data-testid="greeting">Hello, world!</div>;
}

describe("dispatcher", async function () {
  it("should work", async function () {
    const { getByTestId } = render(<Greeting />);
    const div = getByTestId("greeting");
    expect(div.textContent).to.eq("Hello, world!");
  });
});
