import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import styled from "styled-components";
import { Typography } from "../Typography";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/16/solid";

export type DescriptiveAccrodionChild = {
  title: string;
  key?: string;
  description: string;
  color?: string;
};

export type DescriptiveAccordionProps = {
  title: string;
  children: DescriptiveAccrodionChild[];
};

export type DescriptiveAccordionRef = {
  open: (index: number) => void;
  close: (index: number) => void;
  toggle: (index: number) => void;
};

const Container = styled.div`
  border-top: 1.15px solid #eceaf4;
  border-left: 1.15px solid #eceaf4;
  border-right: 1.15px solid #eceaf4;
  background: #f6f8fd;
  border-radius: 10px;
`;
const HeaderContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  color: var(--text-tertiary);
  border-bottom: 1.15px solid #eceaf4;
  cursor: pointer;
`;

const DescriptiveAccordionItem = styled.div`
  padding: 12px 16px;
  color: var(--text-primary);
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: start;
  cursor: pointer;
`;

const ItemContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 90%;
`;

export const DescriptiveAccordion = forwardRef<
  DescriptiveAccordionRef,
  DescriptiveAccordionProps
>(({ title, children }, ref) => {
  const [open, setOpen] = useState<boolean[]>(children.map(() => false));

  useImperativeHandle(ref, () => {
    return {
      open(index: number): void {
        setOpen((old) => {
          const updated = [...old];
          updated[index] = true;
          return updated;
        });
      },
      close(index: number): void {
        setOpen((old) => {
          const updated = [...old];
          updated[index] = false;
          return updated;
        });
      },
      toggle(index: number): void {
        setOpen((old) => {
          const updated = [...old];
          updated[index] = !old[index];
          return updated;
        });
      }
    };
  });

  const renderedChildren = useMemo(() => {
    return (
      <ItemContainer>
        {children.map((child, i) => {
          return (
            <DescriptiveAccordionItem
              key={child.key}
              onClick={() =>
                setOpen((old) => {
                  const updated = [...old];
                  updated[i] = !old[i];
                  return updated;
                })
              }
            >
              {open[i] && (
                <ChevronDownIcon
                  color={child.color ?? "var(--text-tertiary)"}
                  width={20}
                  height={20}
                />
              )}
              {!open[i] && (
                <ChevronRightIcon
                  color={child.color ?? "var(--text-tertiary)"}
                  width={20}
                  height={20}
                />
              )}
              <ContentContainer>
                {/* aligning the text with chevron - since the chevron has some sort of paddin around it, we have to do it on the text*/}
                <Typography
                  style={{ lineHeight: "14px", marginTop: 3 }}
                  color={child.color}
                  fontSize={14}
                  fontWeight={500}
                  family="Rubik"
                >
                  {child.title}
                </Typography>
                {open[i] && (
                  // Taking in to account the shift of the title
                  <Typography
                    color={child.color}
                    fontSize={14}
                    family="Rubik"
                    style={{ marginTop: 3 }}
                  >
                    {child.description}
                  </Typography>
                )}
              </ContentContainer>
            </DescriptiveAccordionItem>
          );
        })}
      </ItemContainer>
    );
  }, [children, open]);
  return (
    <Container>
      <HeaderContainer>
        <Typography fontWeight={700} color="var(--text-tertiary)" fontSize={14}>
          {title.toUpperCase()}
        </Typography>
      </HeaderContainer>
      {open && renderedChildren}
    </Container>
  );
});
