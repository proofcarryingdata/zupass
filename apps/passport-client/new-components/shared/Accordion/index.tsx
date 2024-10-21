import {
  ReactNode,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState
} from "react";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { Typography } from "../Typography";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";

export type AccrodionChild = {
  title: string;
  key?: string;
  icon?: ReactNode;
  onClick?: () => void;
};

export type AccordionProps = {
  title: string;
  children: AccrodionChild[];
  displayOnly?: boolean;
  link?: {
    title: string;
    onClick: () => void;
  };
};

export type AccordionRef = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  getState: () => boolean;
};

const parentContainerOpenCss = css`
  border-bottom: 1.15px solid #eceaf4;
`;
const Container = styled.div<{ open: boolean }>`
  border-top: 1.15px solid #eceaf4;
  border-left: 1.15px solid #eceaf4;
  border-right: 1.15px solid #eceaf4;
  background: #f6f8fd;
  border-radius: 10px;
  ${({ open }): FlattenSimpleInterpolation | undefined =>
    open ? parentContainerOpenCss : undefined}
`;

const closedCss = css`
  border-radius: 10px;
`;
const HeaderContainer = styled.div<{ open: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  color: var(--text-tertiary);
  border-bottom: 1.15px solid #eceaf4;
  cursor: pointer;
  ${({ open }): FlattenSimpleInterpolation | undefined =>
    !open ? closedCss : undefined}
`;

const ToggleContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
`;

const AccordionItem = styled.div<{ lastItem: boolean; clickable: boolean }>`
  padding: 12px 16px;
  color: var(--text-primary);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  cursor: ${({ clickable }): string => (clickable ? "pointer" : "unset")};
  ${({ lastItem }): string | undefined =>
    !lastItem ? "border-bottom: 1.15px solid #eceaf4;" : undefined}
`;

const ItemContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Accordion = forwardRef<AccordionRef, AccordionProps>(
  ({ title, children, displayOnly, link }, ref) => {
    const [open, setOpen] = useState(displayOnly || false);

    useImperativeHandle(ref, () => {
      return {
        open(): void {
          setOpen(true);
        },
        close(): void {
          setOpen(displayOnly || false);
        },
        toggle(): void {
          setOpen((old) => displayOnly || !old);
        },
        getState(): boolean {
          return open;
        }
      };
    });

    const renderedChildren = useMemo(() => {
      const len = children.length;
      return (
        <ItemContainer>
          {children.map((child, i) => {
            const isLast = len - 1 === i;
            return (
              <AccordionItem
                clickable={!!child.onClick}
                key={child.key}
                onClick={child.onClick}
                lastItem={isLast}
              >
                <Typography fontSize={14} fontWeight={500} family="Rubik">
                  {child.title}
                </Typography>
                {child.icon}
              </AccordionItem>
            );
          })}
        </ItemContainer>
      );
    }, [children]);
    const getTitleRight = (): ReactNode[] => {
      const comp: ReactNode[] = [];
      if (link) {
        comp.push(
          <Typography
            onClick={link.onClick}
            fontWeight={700}
            color="var(--core-accent)"
            fontSize={14}
          >
            {link.title}
          </Typography>
        );
      } else if (!open && children.length > 1) {
        comp.push(
          <Typography
            fontWeight={700}
            color="var(--text-tertiary)"
            fontSize={14}
          >
            {children.length}
          </Typography>,
          <FaChevronRight size={12} />
        );
      } else {
        comp.push(<FaChevronDown size={12} />);
      }
      return comp;
    };
    return (
      <Container open={open}>
        <HeaderContainer
          open={open}
          onClick={
            displayOnly
              ? undefined
              : (): void => {
                  setOpen((old) => !old);
                }
          }
        >
          <Typography
            fontWeight={700}
            color="var(--text-tertiary)"
            fontSize={14}
          >
            {title.toUpperCase()}
          </Typography>
          <ToggleContainer>{getTitleRight()}</ToggleContainer>
        </HeaderContainer>
        {open && renderedChildren}
      </Container>
    );
  }
);
