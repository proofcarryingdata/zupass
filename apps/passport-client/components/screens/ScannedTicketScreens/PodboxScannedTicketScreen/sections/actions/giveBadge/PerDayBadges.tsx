import { ActionConfigResponseValue } from "@pcd/passport-interface";
import { ReactNode } from "react";
import styled from "styled-components";

export function PerDayBadges({
  precheck
}: {
  precheck: ActionConfigResponseValue;
}): ReactNode {
  const options = precheck.giveBadgeActionInfo?.rateLimitedBadges;

  // const perDayBadges = useMemo(() => {
  //   return options.filter((o) => isPerDayBadge(o));
  // }, [options]);

  return (
    <Container>
      {/* badges you can give some amount of per day <br />
      {perDayBadges.map((o) => (
        <div key={o.id}>{JSON.stringify(o)}</div>
      ))} */}
      <pre>{JSON.stringify(options, null, 2)}</pre>
    </Container>
  );
}

export const Container = styled.div`
  background-color: red;
`;
