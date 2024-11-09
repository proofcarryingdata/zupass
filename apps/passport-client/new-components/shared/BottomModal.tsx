import { ReactNode, forwardRef, useCallback, useRef } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { MAX_WIDTH_SCREEN } from "../../src/sharedConstants";
import { Typography } from "./Typography";

const BottomModalOverlay = styled.div<{ $fullScreen?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow-x: hidden;
  overflow-y: hidden;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  padding: 0px 12px 12px 12px;
  display: flex;
  align-items: end;
`;

const BottomModalContainer = styled.div<{
  $height?: React.CSSProperties["height"];
}>`
  padding: 24px 24px 20px 24px;
  gap: 20px;
  border-radius: 40px;
  background: #ffffff;
  margin-top: 12px;
  bottom: 12px;
  color: black;
  flex: 1;
  box-shadow: 0px 4px 6px -1px #0000001a;
  width: 100%;
  max-width: ${MAX_WIDTH_SCREEN}px;
  max-height: 100%;
  height: ${({ $height }): string | number => ($height ? $height : "auto")};
  margin: 0 auto;
  overflow-y: auto;
`;

export type BottomModalProps = {
  isOpen: boolean;
  children: ReactNode;
  modalContainerStyle?: React.CSSProperties;
  onClickOutside?: () => void;
  height?: React.CSSProperties["height"];
  dismissable?: boolean;
};

export const BottomModal = forwardRef<HTMLDivElement, BottomModalProps>(
  (
    {
      isOpen,
      children,
      modalContainerStyle,
      onClickOutside,
      height,
      dismissable = true
    },
    ref
  ) => {
    const dispatch = useDispatch();
    const modalContentRef = useRef<HTMLDivElement>(null);
    const isClickInsideModalRef = useRef(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      isClickInsideModalRef.current = !!modalContentRef.current?.contains(
        e.target as Node
      );
    }, []);

    const handleMouseUp = useCallback(() => {
      if (!isClickInsideModalRef.current && dismissable) {
        dispatch({
          type: "set-bottom-modal",
          modal: { modalType: "none" }
        });
        onClickOutside && onClickOutside();
      }
      isClickInsideModalRef.current = false;
    }, [dismissable, dispatch, onClickOutside]);

    if (!isOpen) {
      return null;
    }

    return (
      <BottomModalOverlay
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <BottomModalContainer
          ref={ref}
          style={modalContainerStyle}
          onClick={(e) => {
            // Consider use clickOutside hook instead of that
            e.stopPropagation();
          }}
          $height={height}
        >
          <div ref={modalContentRef}>{children}</div>
        </BottomModalContainer>
      </BottomModalOverlay>
    );
  }
);

const TextBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
`;

export const BottomModalHeader = ({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children?: ReactNode;
}): JSX.Element => {
  return (
    <TextBlock>
      <Typography fontWeight={800} fontSize={20} color="var(--text-primary)">
        {title}
      </Typography>
      <Typography fontSize={16} color="var(--text-primary)" family="Rubik">
        {description}
      </Typography>
      {children || null}
    </TextBlock>
  );
};
