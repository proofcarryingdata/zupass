import { ReactElement } from "react";
import styled from "styled-components";
const AVATAR_SIZE = 36;
type IconProps = {
  imgSrc?: string;
};

const Inner = styled.div<{ size: number }>`
  width: ${({ size }): number => size / 3}px;
  height: ${({ size }): number => size / 3}px;
  border-radius: ${({ size }): number => size / 3}px;
  background: #bcc4dc;
`;

const Outer = styled.div<{ size: number }>`
  width: ${({ size }): number => size}px;
  height: ${({ size }): number => size}px;
  border-radius: ${({ size }): number => size / 3}px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #e4eaff;
`;

const AvatarImage = styled.div<{ src: string }>`
  background: url(${({ src }): string => src});
  background-size: cover;
  background-position: 50% 50%;
  width: 100%;
  height: 100%;
`;

export const Avatar = ({ imgSrc }: IconProps): ReactElement => {
  return (
    <Outer size={AVATAR_SIZE}>
      {imgSrc ? <AvatarImage src={imgSrc} /> : <Inner size={AVATAR_SIZE} />}
    </Outer>
  );
};
