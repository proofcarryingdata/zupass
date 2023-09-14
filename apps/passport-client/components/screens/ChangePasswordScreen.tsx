import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useSelf } from "../../src/appHooks";
import {
  BackgroundGlow,
  BigInput,
  CenterColumn,
  H1,
  HR,
  Spacer,
  TextCenter
} from "../core";
import { LinkButton } from "../core/Button";
import { AppContainer } from "../shared/AppContainer";
import { NewPasswordForm } from "../shared/NewPasswordForm";

export function ChangePasswordScreen() {
  const self = useSelf();
  const navigate = useNavigate();

  useEffect(() => {
    if (self == null) {
      console.log("Not logged in, redirecting to login screen");
      navigate("/login", { replace: true });
    }
  }, [self, navigate]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
          <BigInput
            placeholder="Current password"
            autoFocus
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <Spacer h={8} />
          <NewPasswordForm
            passwordInputPlaceholder="New password"
            email={self.email}
            submitButtonText="Change"
            password={password}
            confirmPassword={confirmPassword}
            setPassword={setPassword}
            setConfirmPassword={setConfirmPassword}
            onSuccess={() => {
              // TODO
            }}
          />
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
