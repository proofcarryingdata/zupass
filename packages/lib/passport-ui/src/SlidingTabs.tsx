import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

interface Tab<T> {
  label: string;
  value: T;
}

interface SlidingTabsProps<T> {
  tabs: Tab<T>[];
  onChange: (value: T) => void;
  initialIndex?: number;
}

const TabsContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  padding: 4px;
  border-radius: 8px;
  background: #ebf1f6;
  box-shadow: 0px 4px 20px rgba(31, 33, 39, 0.08);
  user-select: none;
`;

const TabsWrapper = styled.div`
  display: flex;
  position: relative;
  gap: 4px;
  flex: 1;
`;

const TabItem = styled.div<{ active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  padding: 6px 10px;

  /* text-sm (14px)/medium-rubik */
  font-family: Rubik;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 135%; /* 18.9px */
  color: ${({ active }): string =>
    active
      ? "color: var(--text-primary, #1E2C50)"
      : "var(--text-tertiary, #8B94AC)"};
  transition-property: all, outline-offset;
  transition-duration: 0.3s, 0;
  &:focus-visible {
    outline: 2px solid var(--clr-black);
    outline-offset: -7px;
    border-radius: 3.5rem;
  }
`;

const Indicator = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  transition: all 0.3s;

  padding: 6px 10px;

  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;

  /* shadow-sm */
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
`;

export const SlidingTabs = <T>({
  tabs,
  onChange,
  initialIndex = 0
}: SlidingTabsProps<T>): JSX.Element => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.children[activeIndex] as HTMLElement;
      setIndicatorStyle({
        width: activeTab.offsetWidth,
        left: activeTab.offsetLeft
      });
    }
  }, [activeIndex]);

  const handleTabClick = (index: number): void => {
    if (index === activeIndex) return;
    onChange(tabs[index].value);
    setActiveIndex(index);
  };

  return (
    <TabsContainer role="tablist">
      <TabsWrapper ref={tabsRef}>
        {tabs.map((tab, index) => {
          const active = activeIndex === index;
          return (
            <TabItem
              tabIndex={0}
              role="tab"
              aria-selected={active}
              key={index}
              active={active}
              onClick={() => handleTabClick(index)}
              onKeyDown={(e) => {
                if (["Enter", " "].includes(e.key)) {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTabClick(index);
                }
              }}
            >
              {tab.label}
            </TabItem>
          );
        })}
        <Indicator style={indicatorStyle} />
      </TabsWrapper>
    </TabsContainer>
  );
};
