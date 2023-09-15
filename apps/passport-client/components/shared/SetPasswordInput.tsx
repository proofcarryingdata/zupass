import { Dispatch, SetStateAction } from "react";
import styled from "styled-components";
import { BigInput } from "../core";
import { icons } from "../icons";

interface SetPasswordInputProps {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  revealPassword: boolean;
  setRevealPassword: Dispatch<SetStateAction<boolean>>;
  placeholder: string;
  autoFocus?: boolean;
}

export function SetPasswordInput({
  value,
  setValue,
  revealPassword,
  autoFocus,
  setRevealPassword,
  placeholder
}: SetPasswordInputProps) {
  return (
    <Container>
      <BigInput
        autoFocus={autoFocus}
        type={revealPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <ShowHidePasswordIconContainer>
        <ShowHidePasswordIcon
          draggable="false"
          src={revealPassword ? icons.eyeClosed : icons.eyeOpen}
          width={24}
          height={24}
          onClick={() => setRevealPassword((curr) => !curr)}
        />
      </ShowHidePasswordIconContainer>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  position: relative;
`;

const ShowHidePasswordIconContainer = styled.div`
  position: absolute;
  right: 12px;
  height: 100%;
  display: flex;
  align-items: center;
  top: 0;
`;

const ShowHidePasswordIcon = styled.img`
  cursor: pointer;
`;
