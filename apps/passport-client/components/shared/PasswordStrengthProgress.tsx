import { FC } from "react";
import styled from "styled-components";
import { PasswordStrength } from "../../src/password";

interface PasswordStrengthProgressProps {
  password: string;
}

const PasswordStrengthProgress: FC<PasswordStrengthProgressProps> = ({
  password
}) => {
  // Hide spinner if zxcvbn.js not loaded yet
  if (!window.zxcvbn) {
    return null;
  }
  if (!password) {
    return <ProgressPie progress={0} progressColor="transparent" />;
  }
  const { score } = window.zxcvbn(password);
  switch (score) {
    case PasswordStrength.WEAK:
      return (
        <ProgressPie
          progress={25}
          progressColor="rgba(255, 143, 143, 0.88)"
          title="Weak Password"
        />
      );
    case PasswordStrength.MODERATE:
      return (
        <ProgressPie progress={75} progressColor="rgba(223, 171, 14, 0.88)" />
      );
    case PasswordStrength.STRONG:
    default:
      return (
        <ProgressPie progress={100} progressColor="rgba(25, 199, 127, 0.88)" />
      );
  }
};

const ProgressPie = styled.div<{ progress: number; progressColor: string }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(
      closest-side,
      var(--bg-dark-primary) 59%,
      transparent 60% 100%
    ),
    conic-gradient(
      ${({ progressColor }) => progressColor} ${({ progress }) => progress}%,
      rgba(var(--white-rgb), 0.05) 5%
    );
`;

export default PasswordStrengthProgress;
