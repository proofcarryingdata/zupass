import React, { ReactElement, useEffect, useState } from "react";
import { BottomModal } from "../BottomModal";
import { useBottomModal, useDispatch } from "../../../src/appHooks";
import styled from "styled-components";
import { Typography } from "../Typography";

const timeToStartDate = (eventStartDate: string): string => {
  const startDate = new Date(eventStartDate);

  const gap = Math.abs(Date.now() - startDate.getTime());
  let seconds = Math.floor(gap / 1000);
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;
  // Format the time string without spans
  return `${days}d:${hours}h:${minutes}m:${seconds}s`;
};
const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  gap: 20px;
`;

const YesButton = styled.div`
  border-radius: 4px;
  background: #17a34a;
  width: 180px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
`;

export const TimerModal = (): ReactElement | null => {
  const activeButtomModal = useBottomModal();
  const isOpen = activeButtomModal.modalType === "timer";
  const [time, setTime] = useState("");
  const dispatch = useDispatch();
  useEffect(() => {
    if (!isOpen || !activeButtomModal.ticket.claim.ticket.eventStartDate)
      return;
    const eventStartDate = activeButtomModal.ticket.claim.ticket.eventStartDate;
    const text = timeToStartDate(eventStartDate);
    setTime(text);
    const interval = setInterval(function () {
      const text = timeToStartDate(eventStartDate);
      setTime(text);
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [activeButtomModal, isOpen]);

  if (!isOpen || !activeButtomModal.ticket.claim.ticket.eventStartDate)
    return null;

  return (
    <BottomModal isOpen={isOpen} height={"230px"} center>
      <Container>
        <Typography>
          <Typography family="PlexSans" color="#17a34a" fontSize={18}>
            FROGCRYPTO{" "}
          </Typography>
          unlocks in
        </Typography>
        <Typography
          family="PlexSans"
          fontSize={32}
          style={{
            background:
              "linear-gradient( 90deg,#ff8585 28.44%,#b4bd51 41.87%,#5ceb8e 55.83%,#4b6ee2 66.68%,#dd4be2 78.56%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          {time}
        </Typography>
        <YesButton
          onClick={() => {
            dispatch({
              type: "set-bottom-modal",
              modal: { modalType: "none" }
            });
          }}
        >
          <Typography color="white">Yes</Typography>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="20"
            viewBox="0 0 41 32"
            fill="none"
          >
            <path
              d="M39.8985 9.69016C39.8985 5.42073 36.4459 1.95996 32.1865 1.95996C29.0961 1.95996 26.4383 3.78611 25.2076 6.41626C23.7812 6.19747 22.293 6.07843 20.7611 6.07843C19.2292 6.07843 17.7802 6.19481 16.3703 6.40762C15.1383 3.78212 12.4825 1.95996 9.39539 1.95996C5.13599 1.95996 1.68335 5.42073 1.68335 9.69016C1.68335 11.2769 2.1617 12.7512 2.97975 13.9782C2.23203 15.2743 1.82268 16.6749 1.82268 18.1366C1.82268 24.7961 10.3017 30.1947 20.7604 30.1947C31.2192 30.1947 39.6982 24.7961 39.6982 18.1366C39.6982 16.6935 39.2988 15.3102 38.569 14.0274C39.4069 12.7905 39.8979 11.2975 39.8979 9.68949L39.8985 9.69016Z"
              fill="#74DB61"
              stroke="#154133"
              stroke-width="2"
            />
            <path
              d="M9.45699 11.1948C10.7167 11.1948 11.738 9.86595 11.738 8.22678C11.738 6.5876 10.7167 5.25879 9.45699 5.25879C8.19725 5.25879 7.17603 6.5876 7.17603 8.22678C7.17603 9.86595 8.19725 11.1948 9.45699 11.1948Z"
              fill="#154133"
            />
            <path
              d="M32.1245 11.1948C33.3842 11.1948 34.4054 9.86595 34.4054 8.22678C34.4054 6.5876 33.3842 5.25879 32.1245 5.25879C30.8647 5.25879 29.8435 6.5876 29.8435 8.22678C29.8435 9.86595 30.8647 11.1948 32.1245 11.1948Z"
              fill="#154133"
            />
            <path
              d="M9.19039 20.2213C10.4501 20.2213 11.4714 18.6094 11.4714 16.6209C11.4714 14.6325 10.4501 13.0205 9.19039 13.0205C7.93065 13.0205 6.90942 14.6325 6.90942 16.6209C6.90942 18.6094 7.93065 20.2213 9.19039 20.2213Z"
              fill="#F9C1D4"
            />
            <path
              d="M32.3916 20.2213C33.6513 20.2213 34.6725 18.6094 34.6725 16.6209C34.6725 14.6325 33.6513 13.0205 32.3916 13.0205C31.1318 13.0205 30.1106 14.6325 30.1106 16.6209C30.1106 18.6094 31.1318 20.2213 32.3916 20.2213Z"
              fill="#F9C1D4"
            />
            <path
              d="M20.7908 18.8751C17.9001 18.8751 15.5488 16.6925 15.5488 14.0098C15.5488 13.6068 15.8746 13.2803 16.2766 13.2803C16.6787 13.2803 17.0045 13.6068 17.0045 14.0098C17.0045 15.8878 18.7029 17.4154 20.7901 17.4154C22.8774 17.4154 24.5758 15.8878 24.5758 14.0098C24.5758 13.6068 24.9023 13.2803 25.3037 13.2803C25.705 13.2803 26.0315 13.6068 26.0315 14.0098C26.0315 16.6925 23.6802 18.8751 20.7895 18.8751H20.7908Z"
              fill="#154133"
            />
          </svg>
        </YesButton>
      </Container>
    </BottomModal>
  );
};
