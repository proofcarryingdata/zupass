import type StateManagedSelect from "react-select";
import ReactSelect from "react-select";
import styled from "styled-components";

export default function Select<Option = unknown>(
  props: React.ComponentProps<typeof ReactSelect<Option>>
): JSX.Element {
  // preventing select to trigger on click outside on modal
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <StyledSelect classNamePrefix="Select" isSearchable {...props} />
    </div>
  );
}

const StyledSelect: StateManagedSelect = styled(ReactSelect)`
  .Select__control {
    width: 100%;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    background: #fff;
    font:
      14px Barlow,
      system-ui,
      sans-serif;
    color: var(--text-primary);
    font-weight: 500;
  }

  .Select__control--is-focused {
    box-shadow: 0 0 0 1px var(--white);
    outline: none;

    .Select__dropdown-indicator {
      color: var(--text-primary);
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
      color: var(--text-primary);
    }
  }

  .Select__menu {
    border: 1px solid rgba(0, 0, 0, 0.05);
    background: #fff;
    max-height: 15vh;

    overflow: scroll;
  }

  .Select__option {
    background-color: #fff;

    color: var(--text-primary);
    font:
      14px Barlow,
      system-ui,
      sans-serif;
    &:hover {
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
  }

  .Select__placeholder,
  .Select__single-value {
    color: var(--text-primary);
  }
`;
