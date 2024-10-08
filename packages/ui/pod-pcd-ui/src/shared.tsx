import { styled } from "@pcd/passport-ui";

export const Container = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
`;
const BlockContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Block = styled.div`
  display: flex;
  padding: 4px;
  flex-direction: column;
  align-items: flex-start;
  align-self: stretch;
  border-radius: 8px;
`;

export const Title = styled.div`
  color: var(--text-tertiary);
  font-family: Barlow;
  font-size: 14px;
  font-weight: 700;
  line-height: 135%;
`;

export const Text = styled.div`
  color: var(--text-primary);
  font-family: Rubik;
  font-size: 16px;
  font-weight: 700;
  line-height: 135%;
`;
