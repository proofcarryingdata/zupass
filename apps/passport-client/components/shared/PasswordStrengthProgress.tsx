import { CircularProgress, Size } from "@skiff-org/skiff-ui";
import { CircularProgressProps } from "@skiff-org/skiff-ui/built/src/components/CircularProgress/CircularProgress.types";
import { FC } from "react";
import { PasswordStrength } from "../../src/password";

interface PasswordStrengthProgressProps {
  password: string;
}

const PasswordStrengthProgress: FC<PasswordStrengthProgressProps> = ({
  password
}) => {
  const getCircularProgressProps = (): CircularProgressProps => {
    if (!password) {
      return { progressColor: "none", progress: 0 };
    }
    const { score } = zxcvbn(password);
    switch (score) {
      case PasswordStrength.WEAK:
        return { progressColor: "red", progress: 25, tooltip: "Weak password" };
      case PasswordStrength.MODERATE:
        return {
          progressColor: "yellow",
          progress: 75
        };
      case PasswordStrength.STRONG:
      default:
        return {
          progressColor: "green",
          progress: 100
        };
    }
  };

  return <CircularProgress size={Size.SMALL} {...getCircularProgressProps()} />;
};

export default PasswordStrengthProgress;
