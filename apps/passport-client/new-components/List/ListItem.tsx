import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { Typography } from "../Typography";
import { FaChevronRight } from "react-icons/fa";
import { Avatar } from "../Avatar";
import { ReactElement } from "react";

export type ListItemVariant = "primary" | "danger";
export type ListItemType = {
  title: string;
  LeftIcon?: React.ReactNode;
  variant?: ListItemVariant;
  showBottomBorder?: boolean;
  key?: string;
  onClick?: () => void;
};

const getVariantColor = (variant: ListItemVariant): string => {
  switch (variant) {
    case "danger":
      return "var(--new-danger)";
    default:
    case "primary":
      return "var(--text-primary)";
  }
};

const listItemClickableCSS = css`
  cursor: pointer;
  // so it wont be annoying ot click on an item
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */
`;

const ListItemContainer = styled.div<{
  variant: ListItemVariant;
  isClickable: boolean;
}>`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  color: ${({ variant }): string => getVariantColor(variant)};
  ${({ isClickable }): FlattenSimpleInterpolation | undefined =>
    isClickable ? listItemClickableCSS : undefined};
`;

const ListItemRightContainer = styled.div<{ showBottomBorder: boolean }>`
  flex: 1 1 auto;

  display: flex;
  height: 56px;
  align-items: center;
  justify-content: space-between;
  ${({ showBottomBorder }): string | undefined =>
    showBottomBorder
      ? "border-bottom: 1px solid rgba(0, 0, 0, 0.05);"
      : undefined};
`;

const IconContainer = styled.div`
  width: 36px;
  height: 36px;

  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ListItem = ({
  title,
  LeftIcon,
  variant,
  showBottomBorder,
  onClick
}: ListItemType): ReactElement => {
  const defaultVariant = variant ?? "primary";
  const defaultShowBottomBorder =
    showBottomBorder !== undefined ? showBottomBorder : true;
  return (
    <ListItemContainer
      variant={defaultVariant}
      onClick={onClick}
      isClickable={!!onClick}
    >
      <IconContainer>{LeftIcon ? LeftIcon : <Avatar />}</IconContainer>
      <ListItemRightContainer showBottomBorder={defaultShowBottomBorder}>
        <Typography
          family="Rubik"
          fontWeight={500}
          fontSize={16}
          color={getVariantColor(defaultVariant)}
        >
          {title}
        </Typography>
        <FaChevronRight color={getVariantColor(defaultVariant)} />
      </ListItemRightContainer>
    </ListItemContainer>
  );
};
