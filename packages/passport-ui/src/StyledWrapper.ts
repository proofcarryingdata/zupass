// Based on pattern described here: https://github.com/lidofinance/ui/pull/460
import _styled, { StyledInterface } from "styled-components";

// @ts-expect-error Property 'default' does not exist on type 'StyledInterface'.
const styled: StyledInterface = _styled.default || _styled;

export * from "styled-components";
export default styled;
