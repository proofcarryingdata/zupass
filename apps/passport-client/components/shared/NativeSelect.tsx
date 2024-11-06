import React, { useState } from "react";
import styled from "styled-components";

export const NativeSelect: React.FC<
  React.ComponentProps<typeof StyledSelect> & {
    options: Array<{ label: string; value: string }>;
    defaultValue?: { label: string; value: string };
    onChange?: (option: { label: string; value: string } | null) => void;
    isDisabled?: boolean;
  }
> = ({ options, defaultValue, onChange, isDisabled, ...props }) => {
  const [selectedValue, setSelectedValue] = useState(defaultValue?.value || "");

  return (
    <SelectWrapper>
      <StyledSelect
        value={selectedValue}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const newValue = e.target.value;
          setSelectedValue(newValue);
          const selectedOption = options.find((opt) => opt.value === newValue);
          onChange?.(selectedOption || null);
        }}
        disabled={isDisabled || options.length <= 1}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </StyledSelect>
      <SelectArrow />
    </SelectWrapper>
  );
};

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const StyledSelect = styled.select`
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: #fff;
  font: 14px Barlow;
  color: var(--text-primary);
  font-weight: 500;
  padding: 8px 12px;
  padding-right: 30px;
  appearance: none;
  cursor: pointer;

  &:focus {
    outline: none;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const SelectArrow = styled.div`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--text-primary);
  pointer-events: none;
`;
