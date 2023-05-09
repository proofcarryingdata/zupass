import styled from "styled-components";

export const BigInput = styled.input`
  width: 100%;
  height: 46px;
  border-radius: 46px;
  padding: 12px;
  font-size: 16px;
  font-weight: 300;
  border: 1px solid rgba(var(--white-rgb), 0.3);
  background: transparent;
  color: #fff;
  text-align: center;
  &::placeholder {
    color: rgba(var(--white-rgb), 0.3);
  }
`;
