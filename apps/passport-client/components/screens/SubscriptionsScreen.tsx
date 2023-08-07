import styled from "styled-components";
import { useSubscriptions } from "../../src/appHooks";

export function SubscriptionsScreen() {
  const { value: subs } = useSubscriptions();

  return (
    <Container>
      these are your subscriptions
      <br />
      you have:
      <div> {subs.getProviders().length} providers</div>
      <div>{subs.getActiveSubscriptions().length} active subscriptions</div>
    </Container>
  );
}

const Container = styled.div`
  padding: 64px;
`;
