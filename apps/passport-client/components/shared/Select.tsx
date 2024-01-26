import ReactSelect from "react-select";
import styled from "styled-components";

export default function Select<Option = unknown>(
  props: React.ComponentProps<typeof ReactSelect<Option>>
): JSX.Element {
  return <StyledSelect classNamePrefix="Select" isSearchable {...props} />;
}

const StyledSelect = styled(ReactSelect)`
  .Select__control {
    width: 100%;
    background-color: var(--bg-dark-gray);
    border: 1px solid var(--bg-lite-gray);
    font:
      14px PlexSans,
      system-ui,
      sans-serif;
  }

  .Select__control--is-focused {
    box-shadow: 0 0 0 1px var(--white);
    outline: none;

    .Select__dropdown-indicator {
      color: hsl(0, 0%, 80%);
    }
  }

  .Select__control--is-disabled .Select__dropdown-indicator {
    display: none;
  }

  .Select__indicator-separator {
    display: none;
  }

  .Select__dropdown-indicator {
    &:hover {
      color: var(--white);
    }
  }

  .Select__menu {
    background-color: var(--bg-dark-gray);
    border: 1px solid var(--bg-lite-gray);
  }

  .Select__option {
    background-color: var(--bg-dark-gray);

    &:hover {
      background-color: var(--bg-lite-gray);
    }
  }

  .Select__placeholder,
  .Select__single-value {
    color: var(--white);
  }
`;
