import {
  ArrowDownTrayIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowUpTrayIcon,
  EnvelopeIcon,
  EyeIcon,
  InformationCircleIcon,
  TrashIcon
} from "@heroicons/react/24/solid";
import { serializeStorage } from "@pcd/passport-interface";
import { useCallback, useMemo } from "react";
import styled from "styled-components";
import {
  useBottomModal,
  useDispatch,
  useHasSetupPassword,
  usePCDCollection,
  useSelf,
  useStateContext,
  useSubscriptions
} from "../../../src/appHooks";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
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
        onClick: exportData
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
        <UserTitleContainer>
          <Typography fontSize={20} fontWeight={800} align="center">
            {state.self?.emails[0]}
          </Typography>
        </UserTitleContainer>
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
          Back
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

const UserTitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
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

const useExport = (): (() => void) => {
  const user = useSelf();
  const pcds = usePCDCollection();
  const subscriptions = useSubscriptions();

  return useCallback(async () => {
    if (!user) return;
    // Since we already use this data for remote sync, we know that it's
    // sufficient for loading an account on to a new device.
    const { serializedStorage, storageHash } = await serializeStorage(
      user,
      pcds,
      subscriptions.value
    );

    // Data in a data URL must be Base64-encoded
    const data = Buffer.from(JSON.stringify(serializedStorage)).toString(
      "base64"
    );

    // Trigger the download
    const link = document.createElement("a");
    link.href = `data://text/json;base64,${data}`;
    link.download = `zupass-${storageHash}.json`;
    link.click();
    link.remove();
  }, [user, pcds, subscriptions]);
};
