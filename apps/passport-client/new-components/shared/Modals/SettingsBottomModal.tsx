import {
  ArrowDownTrayIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowUpTrayIcon,
  EnvelopeIcon,
  EyeIcon,
  InformationCircleIcon,
  TrashIcon
} from "@heroicons/react/16/solid";
import { useMemo } from "react";
import styled from "styled-components";
import {
  useBottomModal,
  useDispatch,
  useHasSetupPassword
} from "../../../src/appHooks";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Typography } from "../Typography";
import { useExport } from "../utils";

interface SettingItem {
  title: string;
  icon: JSX.Element;
  onClick: () => void;
  variant?: "danger";
}

export function SettingsBottomModal(): JSX.Element {
  const activeBottomModal = useBottomModal();
  const dispatch = useDispatch();
  const hasSetupPassword = useHasSetupPassword();
  const exportData = useExport();

  const items: SettingItem[] = useMemo(
    () => [
      {
        title: "About Zupass",
        icon: <InformationCircleIcon width={24} height={24} color="#7C8BB4" />,

        onClick: (): void => {
          dispatch({
            type: "set-bottom-modal",
            modal: {
              modalType: "about"
            }
          });
        }
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
        onClick: (): void => {
          dispatch({
            type: "set-bottom-modal",
            modal: {
              modalType: "manage-emails"
            }
          });
        }
      },
      {
        title: "Import",
        icon: <ArrowUpTrayIcon width={24} height={24} color="#7C8BB4" />,
        onClick: (): void => {
          dispatch({
            type: "set-bottom-modal",
            modal: {
              modalType: "import"
            }
          });
        }
      },
      {
        title: "Export",
        icon: <ArrowDownTrayIcon width={24} height={24} color="#7C8BB4" />,
        onClick: async (): Promise<void> => {
          await exportData();
          dispatch({
            type: "set-bottom-modal",
            modal: {
              modalType: "success-modal",
              title: "EXPORT SUCCESSFUL",
              description:
                "Your data has been exported and sent to your local folder."
            }
          });
        }
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
        onClick: (): void => {
          dispatch({
            type: "set-bottom-modal",
            modal: {
              modalType: "delete-account"
            }
          });
        },
        variant: "danger"
      }
    ],
    [dispatch, hasSetupPassword, exportData]
  );

  return (
    <BottomModal isOpen={activeBottomModal.modalType === "settings"}>
      <SettingsContainer>
        <SettingsActionContainer>
          {items.map(({ icon, title, onClick, variant }, i) => (
            <SettingsItemButton key={title} onClick={onClick}>
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
                family="Rubik"
                color={variant === "danger" ? "#E0431C" : "#1E2C50"}
              >
                {title}
              </Typography>
            </SettingsItemButton>
          ))}
        </SettingsActionContainer>
        <Button2
          onClick={() => {
            dispatch({
              type: "set-bottom-modal",
              modal: {
                modalType: "none"
              }
            });
          }}
        >
          Close
        </Button2>
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

const SettingsActionContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const SettingsItemButton = styled.div<{ $variant?: "danger" }>`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0px 12px;
  gap: 16px;
  cursor: pointer;
  user-select: none;
  &:focus {
    outline: none;
    background-color: "#7c8bb443";
  }
  &:active {
    background-color: "#7c8bb443";
  }
  ${({ $variant }): string => ($variant === "danger" ? `color: red;` : "")}
`;
