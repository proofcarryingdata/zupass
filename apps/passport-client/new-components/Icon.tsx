import styled from "styled-components";
const ICON_SIZE = 36;
type IconProps = {
  imgSrc?: string;
};

const Inner = styled.div<{ size: number }>`
  width: ${({ size }) => size / 3}px;
  height: ${({ size }) => size / 3}px;
  border-radius: ${({ size }) => size / 3}px;
  background: ##bcc4dc;
`;

const Outer = styled.div<{ size: number }>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  border-radius: ${({ size }) => size / 3}px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #e4eaff;
`;

const IconImage = styled.img`
  flex-shrink: 0;
  min-height: 100%;
  min-width: 100%;
`;

export const Icon = ({ imgSrc }: { imgSrc?: string }) => {
  return (
    <Outer size={ICON_SIZE}>
      {imgSrc ? <IconImage src={imgSrc} /> : <Inner size={ICON_SIZE} />}
    </Outer>
  );
};
