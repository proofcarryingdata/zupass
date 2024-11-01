import * as React from "react";
import { useCallback } from "react";
import styled from "styled-components";

export function Overlay({
  children,
  onClose
}: {
  children: React.ReactNode | React.ReactNode[];
  onClose: () => void;
}) {
  const ignore = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <ModalBg onClick={onClose}>
      <ModalWrap onClick={ignore}>{children}</ModalWrap>
    </ModalBg>
  );
}

const ModalBg = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 999;
`;

const ModalWrap = styled.div`
  background: radial-gradient(circle, var(--bg-lite-gray), var(--bg-dark-gray));
  color: white;
  font-family: OpenSans;
  top: 4rem;
  left: 0;
  width: 100%;
  margin: 4rem auto 0 auto;
  min-height: 480px;
  padding: 0.75rem;
  border-radius: 0.75rem;
  text-align: center;
`;
