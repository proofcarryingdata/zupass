import { Dispatch, KeyboardEvent, RefObject, SetStateAction } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import styled from "styled-components";
import { BigInput } from "../core";
import PasswordStrengthProgress from "./PasswordStrengthProgress";

interface SetPasswordInputProps {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  revealPassword: boolean;
  setRevealPassword: Dispatch<SetStateAction<boolean>>;
  placeholder: string;
  showStrengthProgress?: boolean;
  onEnter?: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: RefObject<HTMLInputElement>;
  autoFocus?: boolean;
}

export function PasswordInput({
  value,
  setValue,
  revealPassword,
  autoFocus,
  setRevealPassword,
  placeholder,
  showStrengthProgress,
  inputRef,
  onEnter
}: SetPasswordInputProps): JSX.Element {
  return (
    <Container>
      <PasswordBigInput
        $showStrengthProgress={showStrengthProgress}
        onKeyDown={(e): void => {
          if (e.key === "Enter") {
            onEnter?.(e);
          }
        }}
        ref={inputRef}
        autoFocus={autoFocus}
        type={revealPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e): void => setValue(e.target.value)}
      />
      {showStrengthProgress && (
        <PasswordStrengthProgressContainer>
          <PasswordStrengthProgress password={value} />
        </PasswordStrengthProgressContainer>
      )}
      <ShowHidePasswordIconContainer>
        <ShowHidePasswordIcon
          draggable="false"
          onClick={(): void => setRevealPassword((curr) => !curr)}
        >
          {revealPassword ? (
            <FaRegEye size={24} />
          ) : (
            <FaRegEyeSlash size={24} />
          )}
        </ShowHidePasswordIcon>
      </ShowHidePasswordIconContainer>
    </Container>
  );
}

const PasswordBigInput = styled(BigInput)<{ $showStrengthProgress?: boolean }>`
  /* To account for show/hide password icon. We add it to both sides to preserve center text alignment. */
  padding-right: ${(props): string =>
    props.$showStrengthProgress ? "64px" : "40px"};
  padding-left: ${(props): string =>
    props.$showStrengthProgress ? "64px" : "40px"};
`;

const Container = styled.div`
  width: 100%;
  position: relative;
`;

const PasswordStrengthProgressContainer = styled.div`
  position: absolute;
  right: 40px;
  height: 100%;
  display: flex;
  align-items: center;
  top: 0;
`;

const ShowHidePasswordIconContainer = styled.div`
  position: absolute;
  right: 12px;
  height: 100%;
  display: flex;
  align-items: center;
  top: 0;
`;

const ShowHidePasswordIcon = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
`;
