import {
  ArrowDownTrayIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowUpTrayIcon,
  EnvelopeIcon,
  EyeIcon,
  InformationCircleIcon,
  TrashIcon
} from "@heroicons/react/24/solid";
import { useMemo } from "react";
import styled from "styled-components";
import {
  useBottomModal,
  useDispatch,
  useHasSetupPassword,
  useStateContext
} from "../../../src/appHooks";
import { BottomModal } from "../BottomModal";
import { Typography } from "../Typography";

interface SettingItem {
  title: string;
  icon: JSX.Element;
  onClick: () => void;
  variant?: "danger";
}

export function SettingsBottomModal(): JSX.Element {
  const activeBottomModal = useBottomModal();
  const state = useStateContext().getState();
  const dispatch = useDispatch();
  const hasSetupPassword = useHasSetupPassword();

  const items: SettingItem[] = useMemo(
    () => [
      {
        title: "About Zupass",
        icon: <InformationCircleIcon width={24} height={24} color="#7C8BB4" />,
        onClick: (): void => {}
      },
      {
        title: `${hasSetupPassword ? "Change" : "Add"} Password`,
        icon: <EyeIcon width={24} height={24} color="#7C8BB4" />,
        onClick: (): void => {
          dispatch({
            type: "set-bottom-modal",
            modal: {
              modalType: "change-password"
            }
          });
        }
      },
      {
        title: "Manage Emails",
        icon: <EnvelopeIcon width={24} height={24} color="#7C8BB4" />,
        onClick: (): void => {}
      },
      {
        title: "Import",
        icon: <ArrowUpTrayIcon width={24} height={24} color="#7C8BB4" />,
        onClick: (): void => {}
      },
      {
        title: "Export",
        icon: <ArrowDownTrayIcon width={24} height={24} color="#7C8BB4" />,
        onClick: (): void => {}
      },
      {
        title: "Logout",
        icon: (
          <ArrowRightStartOnRectangleIcon
            width={24}
            height={24}
            color="#7C8BB4"
          />
        ),
        onClick: (): void => {
          if (window.confirm("Are you sure you want to log out?")) {
            dispatch({ type: "reset-passport" });
          }
        }
      },
      {
        title: "Delete Account",
        icon: <TrashIcon width={24} height={24} color="#E0431C" />,
        onClick: (): void => {},
        variant: "danger"
      }
    ],
    [dispatch, hasSetupPassword]
  );

  return (
    <BottomModal isOpen={activeBottomModal.modalType === "settings"}>
      <SettingsContainer>
        <UserTitleContainer>
          <Typography fontSize={20} fontWeight={800} align="center">
            {state.self?.emails[0]}
          </Typography>
        </UserTitleContainer>
        <SettingsActionContainer>
          {items.map(({ icon, title, onClick, variant }, i) => (
            <SettingsItemContainer onClick={onClick}>
              {icon}
              <Typography
                fontSize={18}
                fontWeight={500}
                style={{
                  padding: "16px 0px",
                  borderBottom:
                    i !== items.length - 1 ? "1px solid #ECEAF4" : "none",
                  width: "100%"
                }}
                family="Neue Haas Unica"
                color={variant === "danger" ? "#E0431C" : "#1E2C50"}
              >
                {title}
              </Typography>
            </SettingsItemContainer>
          ))}
        </SettingsActionContainer>
      </SettingsContainer>
    </BottomModal>
  );
}

const SettingsContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const UserTitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const SettingsActionContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const SettingsItemContainer = styled.div<{ $variant?: "danger" }>`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0px 12px;
  gap: 16px;
`;
