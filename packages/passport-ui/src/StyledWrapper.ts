// Based on pattern described here: https://github.com/lidofinance/ui/pull/460
// This is necessary because Styled Components 5.x does not conform fully to
// the ESM standard, so we have to wrap it here to create a proper default
// export.
// If we upgrade to Styled 6.x then we can remove this.
import _styled, { StyledInterface } from "styled-components";

// @ts-expect-error Property 'default' does not exist on type 'StyledInterface'.
const styled: StyledInterface = _styled.default || _styled;

export * from "styled-components";
export default styled;
