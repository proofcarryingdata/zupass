import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import styled from "styled-components";
import {
  PASSWORD_MINIMUM_LENGTH,
  checkPasswordStrength
} from "../../src/password";
import { BigInput, Button, Spacer } from "../core";
import { ErrorMessage } from "../core/error";
import { icons } from "../icons";

interface SetPasswordInputProps {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  revealPassword: boolean;
  setRevealPassword: Dispatch<SetStateAction<boolean>>;
  placeholder: string;
  autoFocus?: boolean;
}

function SetPasswordInput({
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

interface NewPasswordForm {
  email: string; // As a hidden element for autofill
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  onSuccess: () => void;
  submitButtonText: string;
  passwordInputPlaceholder?: string; // Override placeholder on the first input
}

export function NewPasswordForm({
  email,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSuccess,
  submitButtonText,
  passwordInputPlaceholder
}: NewPasswordForm) {
  const [revealPassword, setRevealPassword] = useState(false);
  const [passwordError, setErrorMessage] = useState("");

  const checkPasswordAndSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password === "") {
      setErrorMessage("Please enter a password.");
    } else if (password.length < PASSWORD_MINIMUM_LENGTH) {
      setErrorMessage(
        `Password must be at least ${PASSWORD_MINIMUM_LENGTH} characters.`
      );
    } else if (!checkPasswordStrength(password)) {
      // Inspired by Dashlane's zxcvbn guidance:
      // https://www.dashlane.com/blog/dashlanes-new-zxcvbn-guidance-helps-you-create-stronger-master-passwords-and-eliminates-the-guessing-game
      setErrorMessage(
        "Password is too weak. Try adding another word or two. Uncommon words are better."
      );
    } else if (confirmPassword === "") {
      setErrorMessage("Please confirm your password.");
    } else if (password !== confirmPassword) {
      setErrorMessage("Your passwords do not match.");
    } else {
      onSuccess();
    }
    return;
  };

  return (
    <form onSubmit={checkPasswordAndSubmit}>
      {/* For password manager autofill */}
      <input hidden readOnly value={email} />
      <SetPasswordInput
        value={password}
        setValue={(value) => {
          setErrorMessage("");
          setPassword(value);
        }}
        placeholder={passwordInputPlaceholder || "Password"}
        autoFocus
        revealPassword={revealPassword}
        setRevealPassword={setRevealPassword}
      />
      <Spacer h={8} />
      <SetPasswordInput
        value={confirmPassword}
        setValue={(value) => {
          setErrorMessage("");
          setConfirmPassword(value);
        }}
        placeholder="Confirm password"
        revealPassword={revealPassword}
        setRevealPassword={setRevealPassword}
      />
      <Spacer h={8} />
      {passwordError && <ErrorMessage>{passwordError}</ErrorMessage>}
      <Spacer h={16} />
      <Button style="primary" type="submit">
        {submitButtonText}
      </Button>
    </form>
  );
}
