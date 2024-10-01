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
  usePCDCollection,
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
  const pcdCollection = usePCDCollection();
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
      },
      {
        title: "add PCDS",
        icon: <InformationCircleIcon width={24} height={24} color="#E0431C" />,
        onClick: () => {
          const pcd = {
            A: 123,
            B: 321,
            C: "hello",
            D: "foobar",
            E: 123,
            F: 4294967295,
            G: 7,
            H: 8,
            I: 9,
            J: 10,
            K: -5,
            owner: 18711405342588116796533073928767088921854096266145046362753928030796553161041,
            ownerV4:
              "pod_eddsa_pubkey:1nsPGF66uuDfBnpQD+7o/9SPX7L0JDn+lubKh+QGuS8"
          };
          pcdCollection.add(pcd);
        }
      }
    ],
    [dispatch, hasSetupPassword, pcdCollection]
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
            <SettingsItemContainer key={title} onClick={onClick}>
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
