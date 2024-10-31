import { AppContainer } from "../../components/shared/AppContainer";
import { TermsWithTitle } from "../shared/NewPrivacyNotice";

export const NewTermsScreen = (): JSX.Element => {
  return (
    <AppContainer bg="gray">
      <TermsWithTitle title="TERMS OF USE" />
    </AppContainer>
  );
};
