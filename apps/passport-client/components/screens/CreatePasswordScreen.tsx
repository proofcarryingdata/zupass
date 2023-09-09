import { useEffect, useState } from "react";
import PasswordStrengthBar from "react-password-strength-bar";
import styled from "styled-components";
import { verifyTokenServer } from "../../src/api/user";
import { useDispatch, useQuery, useSelf } from "../../src/appHooks";
import { validateEmail } from "../../src/util";
import {
  BackgroundGlow,
  BigInput,
  Button,
  CenterColumn,
  H1,
  HR,
  Spacer,
  TextCenter
} from "../core";
import { LinkButton } from "../core/Button";
import { icons } from "../icons";
import { AppContainer } from "../shared/AppContainer";

const PASSWORD_MINIMUM_LENGTH = 8;

export function CreatePasswordScreen() {
  const dispatch = useDispatch();
  const query = useQuery();
  const email = query?.get("email");
  const token = query?.get("token");
  const [score, setScore] = useState(0);
  const [revealPassword, setRevealPassword] = useState(false);

  useEffect(() => {
    async function checkIfShouldRedirect() {
      try {
        if (!email || !validateEmail(email) || !token) {
          throw new Error("Invalid email or token, redirecting to login");
        }
        const { verified } = await verifyTokenServer(email, token).then((res) =>
          res.json()
        );
        if (!verified) {
          throw new Error("Token is incorrect, redirecting to login");
        }
      } catch (e) {
        console.error(e);
        window.location.hash = "#/login";
        window.location.reload();
      }
    }
    checkIfShouldRedirect();
  }, [email, token]);

  const self = useSelf();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Redirect to home if already logged in
    if (self != null) {
      window.location.hash = "#/";
    }
  }, [self]);

  const onCreatePassword = async () => {
    if (password === "") {
      dispatch({
        type: "error",
        error: {
          title: "Password empty",
          message: "Please enter a password",
          dismissToCurrentPage: true
        }
      });
    } else if (password.length < PASSWORD_MINIMUM_LENGTH) {
      dispatch({
        type: "error",
        error: {
          title: "Password too short",
          message: `Password must be at least ${PASSWORD_MINIMUM_LENGTH} characters`,
          dismissToCurrentPage: true
        }
      });
    } else if (score < 2) {
      // Must not be "too guessable" or "very guessable"
      dispatch({
        type: "error",
        error: {
          title: "Password too weak",
          message: "Please use a stronger password.",
          dismissToCurrentPage: true
        }
      });
    } else if (confirmPassword === "") {
      dispatch({
        type: "error",
        error: {
          title: "Confirm password",
          message: "Please confirm your password",
          dismissToCurrentPage: true
        }
      });
    } else if (password !== confirmPassword) {
      dispatch({
        type: "error",
        error: {
          title: "Confirmation failed",
          message: "Your passwords do not match",
          dismissToCurrentPage: true
        }
      });
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
    <AppContainer bg="primary">
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
            <input hidden value={email} />
            <PasswordInputContainer>
              <BigInput
                autoFocus
                type={revealPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <ShowHidePasswordIconContainer>
                <ShowHidePasswordIcon
                  draggable="false"
                  src={revealPassword ? icons.eyeClosed : icons.eyeOpen}
                  width={32}
                  height={32}
                  onClick={() => setRevealPassword((curr) => !curr)}
                />
              </ShowHidePasswordIconContainer>
            </PasswordInputContainer>
            <Spacer h={8} />
            <BigInput
              type={revealPassword ? "text" : "password"}
              value={confirmPassword}
              placeholder="Confirm password"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Spacer h={8} />
            <PasswordStrengthBarContainer>
              <PasswordStrengthBar
                // To account for border radius of input box
                style={{ width: "calc(100% - 46px" }}
                password={password}
                scoreWordStyle={{ display: "none" }}
                minLength={PASSWORD_MINIMUM_LENGTH}
                onChangeScore={(score) => setScore(score)}
              />
            </PasswordStrengthBarContainer>
            <Spacer h={24} />
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

const PasswordInputContainer = styled.div`
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

const PasswordStrengthBarContainer = styled.div`
  display: flex;
  justify-content: center;
`;
