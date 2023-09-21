import { requestVerifyToken } from "@pcd/passport-interface";
import { FormEvent, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../src/appHooks";
import { checkPasswordStrength } from "../../src/password";
import { validateEmail } from "../../src/util";
import {
  BackgroundGlow,
  Button,
  CenterColumn,
  H1,
  HR,
  Spacer,
  TextCenter
} from "../core";
import { LinkButton } from "../core/Button";
import { ErrorMessage } from "../core/error";
import { AppContainer } from "../shared/AppContainer";
import { SetPasswordInput } from "../shared/SetPasswordInput";

const PASSWORD_MINIMUM_LENGTH = 8;

export function CreatePasswordScreen() {
  const dispatch = useDispatch();
  const self = useSelf();
  const query = useQuery();
  const email = query?.get("email");
  const token = query?.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [passwordError, setErrorMessage] = useState("");

  const redirectToLoginPageWithError = useCallback((e: Error | string) => {
    console.error(e);
    window.location.hash = "#/login";
    window.location.reload();
  }, []);

  const checkIfShouldRedirect = useCallback(async () => {
    if (!email || !validateEmail(email) || !token) {
      return redirectToLoginPageWithError(
        "Invalid email or token, redirecting to login"
      );
    }

    const verifyTokenResult = await requestVerifyToken(
      appConfig.passportServer,
      email,
      token
    );

    if (!verifyTokenResult.success) {
      return redirectToLoginPageWithError(
        "Invalid email or token, redirecting to login"
      );
    }
  }, [email, redirectToLoginPageWithError, token]);

  useEffect(() => {
    checkIfShouldRedirect();
  }, [checkIfShouldRedirect]);

  useEffect(() => {
    // Redirect to home if already logged in
    if (self != null) {
      window.location.hash = "#/";
    }
  }, [self]);

  const onCreatePassword = async (e: FormEvent<HTMLFormElement>) => {
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
      dispatch({
        type: "login",
        email,
        token,
        password
      });
    }
    return;
  };

  return (
    <AppContainer>
      <BackgroundGlow
        y={224}
        from="var(--bg-lite-primary)"
        to="var(--bg-dark-primary)"
      >
        <Spacer h={64} />
        <Header />
        <Spacer h={24} />

        <CenterColumn w={280}>
          <form onSubmit={onCreatePassword}>
            {/* For password manager autofill */}
            <input hidden readOnly value={email} />
            <SetPasswordInput
              value={password}
              setValue={(value) => {
                setErrorMessage("");
                setPassword(value);
              }}
              placeholder="Password"
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
              Continue
            </Button>
          </form>
        </CenterColumn>
        <Spacer h={24} />
        <HR />
        <Spacer h={24} />
        <CenterColumn w={280}>
          <LinkButton to={"/"}>Cancel</LinkButton>
        </CenterColumn>
      </BackgroundGlow>
      <Spacer h={64} />
    </AppContainer>
  );
}

function Header() {
  return (
    <TextCenter>
      <H1>PCDPASS</H1>
      <Spacer h={24} />
      <Description>
        Choose a secure, unique password. This password will be used to generate
        your key to secure your data.
      </Description>
    </TextCenter>
  );
}

const Description = styled.p`
  font-weight: 300;
  width: 220px;
  margin: 0 auto;
`;
