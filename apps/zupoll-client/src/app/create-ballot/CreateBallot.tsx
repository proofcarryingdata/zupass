import { LoadingPlaceholder } from "@/components/ui/LoadingPlaceholder";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaRegTrashAlt } from "react-icons/fa";
import { IoMdAdd } from "react-icons/io";
import { Button } from "../../@/components/ui/button";
import { Card, CardContent } from "../../@/components/ui/card";
import { Input } from "../../@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../@/components/ui/select";
import { Subtitle, Title } from "../../@/components/ui/text";
import { BallotType, Poll } from "../../api/prismaTypes";
import { BallotSignal } from "../../api/requestTypes";
import { BALLOT_TYPE_FROM_LOGIN_CONFIG } from "../../env";
import { LoginConfigurationName, LoginState, ZupollError } from "../../types";
import { USE_CREATE_BALLOT_REDIRECT } from "../../util";
import { GuaranteesElement } from "../main/Guarantees";
import { NewQuestionPlaceholder } from "./NewQuestionPlaceholder";
import { PollsBelowDivider } from "./PollsBelowDivider";
import { BallotFromUrl, useCreateBallot } from "./useCreateBallot";

export function CreateBallot({
  onError,
  loginState
}: {
  onError: (err: ZupollError) => void;
  loginState: LoginState;
}) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [ballotTitle, setBallotTitle] = useState("");
  const [ballotDescription, setBallotDescription] = useState("");
  const [ballotExpiry, setBallotExpiry] = useState<Date>(
    new Date(new Date().getTime() + 1000 * 60 * 60 * 24)
  );
  const [ballotFromUrl, setBallotFromUrl] = useState<BallotFromUrl>();
  const [pcdFromUrl, setPcdFromUrl] = useState("");
  const [ballotType, setBallotType] = useState<BallotType>(
    BALLOT_TYPE_FROM_LOGIN_CONFIG[loginState.config.name]
  );
  const [useLastBallot, setUseLastBallot] = useState(false);
  const getDateString = (date: Date) => {
    const newDate = new Date(date);
    newDate.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return newDate.toISOString().slice(0, 16);
  };
  const updatePollBody = (pollBody: string, index: number) => {
    const newPolls = [...polls];
    newPolls[index].body = pollBody;
    setPolls(newPolls);
  };
  const updatePollOptions = (
    newOption: string,
    pollIndex: number,
    optionIndex: number
  ) => {
    const newPolls = [...polls];
    newPolls[pollIndex].options[optionIndex] = newOption;
    setPolls(newPolls);
  };

  const [serverLoading, setServerLoading] = useState(false);
  const query = useSearchParams();
  useEffect(() => {
    const url = new URL(window.location.href);
    console.log({ url });
    // Use URLSearchParams to get the proof query parameter
    const proofString = query?.get("proof") as string;
    const ballotString = query?.get("ballot") as string;
    if (proofString && ballotString) {
      // Decode the URL-encoded string
      const decodedProofString = decodeURIComponent(proofString);
      // Parse the decoded string into an object
      const proofObject = JSON.parse(decodedProofString);
      const pcdStr = JSON.stringify(proofObject);

      const ballot = JSON.parse(
        decodeURIComponent(ballotString)
      ) as BallotFromUrl;
      console.log(`[RECEIVED BALLOT]`, ballot);
      setPcdFromUrl(pcdStr);
      setBallotFromUrl(ballot);
    }
  }, [query]);

  const { loadingVoterGroupUrl, createBallotPCD } = useCreateBallot({
    ballotTitle,
    ballotDescription,
    ballotType,
    expiry: ballotExpiry,
    polls,
    onError,
    setServerLoading,
    loginState,
    ballotFromUrl,
    pcdFromUrl,
    setBallotFromUrl,
    setPcdFromUrl,
    url: window.location.href // If exists, will use redirect instead of pop up
  });

  useEffect(() => {
    if (useLastBallot) {
      const ballotSignalString = localStorage.getItem("lastBallotSignal");
      const ballotPollsString = localStorage.getItem("lastBallotPolls");

      if (ballotSignalString && ballotPollsString) {
        const ballotSignal = JSON.parse(ballotSignalString) as BallotSignal;
        console.log({ ballotSignal });
        setBallotTitle(ballotSignal.ballotTitle);
        setBallotDescription(ballotSignal.ballotDescription);
        setBallotExpiry(new Date(ballotSignal.expiry));

        const ballotPolls = JSON.parse(ballotPollsString) as Poll[];
        console.log({ ballotPolls });
        setPolls(ballotPolls);
      }
    }
  }, [useLastBallot]);

  return (
    <>
      {USE_CREATE_BALLOT_REDIRECT ? (
        ""
      ) : (
        <p style={{ color: "white" }}>
          Can only create polls in the browser, not Telegram
        </p>
      )}

      <GuaranteesElement />

      <div>
        <Title>New Ballot</Title>
        <Subtitle>Title</Subtitle>
        <Input
          type="text"
          id="body"
          autoComplete="off"
          value={ballotTitle}
          onChange={(e) => setBallotTitle(e.target.value)}
          placeholder="Advisory Vote 04/25"
        />
        <Subtitle>Description</Subtitle>
        <Input
          type="text"
          autoComplete="off"
          id="options"
          value={ballotDescription}
          onChange={(e) => setBallotDescription(e.target.value)}
          placeholder="Advisory vote for 04/25 town hall"
        />
        <Subtitle>Expiration</Subtitle>
        <Input
          type="datetime-local"
          autoComplete="off"
          id="expiry"
          value={getDateString(ballotExpiry)}
          onChange={(e) => setBallotExpiry(new Date(e.target.value))}
        />

        <div className="flex flex-row gap-2 m-2 w-full justify-evenly">
          <Button variant="ghost">1hr</Button>
          <Button variant="ghost">24hr</Button>
          <Button variant="ghost">3d</Button>
          <Button variant="ghost">1wk</Button>
          <Button variant="ghost">1mo</Button>
          <Button variant="ghost">3mo</Button>
          <Button variant="ghost">1yr</Button>
        </div>
        <Subtitle>Ballot Type</Subtitle>
        <Select
          value={ballotType}
          onValueChange={(value: string) => setBallotType(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              {loginState.config.name ===
                LoginConfigurationName.ZUZALU_PARTICIPANT && (
                <>
                  <SelectItem value={BallotType.STRAWPOLL}>
                    Straw Poll
                  </SelectItem>
                </>
              )}
              {loginState.config.name ===
                LoginConfigurationName.ZUZALU_ORGANIZER && (
                <>
                  <SelectItem value={BallotType.STRAWPOLL}>
                    Straw Poll
                  </SelectItem>
                  <SelectItem value={BallotType.ADVISORYVOTE}>
                    Advisory Vote
                  </SelectItem>
                  <SelectItem value={BallotType.ORGANIZERONLY}>
                    Organizer Only
                  </SelectItem>
                </>
              )}
              {loginState.config.name ===
                LoginConfigurationName.DEVCONNECT_PARTICIPANT && (
                <SelectItem value={BallotType.DEVCONNECT_STRAW}>
                  Devconnect Community Poll
                </SelectItem>
              )}
              {loginState.config.name ===
                LoginConfigurationName.DEVCONNECT_ORGANIZER && (
                <>
                  <SelectItem value={BallotType.DEVCONNECT_STRAW}>
                    Community Poll
                  </SelectItem>
                  <SelectItem value={BallotType.DEVCONNECT_ORGANIZER}>
                    Organizer Feedback
                  </SelectItem>
                </>
              )}
              {loginState.config.name ===
                LoginConfigurationName.EDGE_CITY_RESIDENT && (
                <>
                  <SelectItem value={BallotType.EDGE_CITY_RESIDENT}>
                    Edge City Community Poll
                  </SelectItem>
                </>
              )}
              {loginState.config.name ===
                LoginConfigurationName.EDGE_CITY_ORGANIZER && (
                <>
                  <SelectItem value={BallotType.EDGE_CITY_RESIDENT}>
                    Edge City Community Poll
                  </SelectItem>
                  <SelectItem value={BallotType.EDGE_CITY_ORGANIZER}>
                    Edge City Organizer Feedback
                  </SelectItem>
                </>
              )}
              {loginState.config.name ===
                LoginConfigurationName.ETH_LATAM_ATTENDEE && (
                <>
                  <SelectItem value={BallotType.ETH_LATAM_STRAWPOLL}>
                    ETH LatAm Straw Poll
                  </SelectItem>
                </>
              )}
              {loginState.config.name ===
                LoginConfigurationName.ETH_LATAM_ORGANIZER && (
                <>
                  <SelectItem value={BallotType.ETH_LATAM_STRAWPOLL}>
                    ETH LatAm Straw Poll
                  </SelectItem>
                  <SelectItem value={BallotType.ETH_LATAM_FEEDBACK}>
                    ETH LatAm Feedback
                  </SelectItem>
                </>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
        <PollsBelowDivider />
        <div className="flex flex-col gap-4 mb-2">
          {polls.map((poll, i) => {
            return (
              <Card key={i} className="pt-4 relative overflow-hidden">
                <Button
                  onClick={() => {
                    const newPolls = [...polls];
                    newPolls.splice(i, 1);
                    setPolls(newPolls);
                  }}
                  variant={"outline"}
                  style={{
                    position: "absolute",
                    top: "0",
                    right: "0",
                    borderTopLeftRadius: "0",
                    borderBottomRightRadius: "0",
                    borderTop: "none",
                    borderRight: "none"
                  }}
                >
                  <FaRegTrashAlt />
                </Button>
                <CardContent>
                  <Subtitle>Question</Subtitle>
                  <Input
                    className=""
                    type="text"
                    id="body"
                    autoComplete="off"
                    value={poll.body}
                    onChange={(e) => updatePollBody(e.target.value, i)}
                    placeholder="Should we do this?"
                  />
                  <Subtitle>Choices</Subtitle>
                  <div className="flex flex-col gap-1">
                    {poll.options.map((option, j) => (
                      <div key={j} className="flex row gap-2">
                        <Input
                          className="w-full"
                          type="text"
                          autoComplete="off"
                          id="options"
                          value={option}
                          onChange={(e) =>
                            updatePollOptions(e.target.value, i, j)
                          }
                          placeholder={`Option #${j + 1}`}
                        />
                        <Button
                          variant="ghost"
                          disabled={polls[i].options.length <= 2}
                          onClick={() => {
                            const newPolls = [...polls];
                            if (newPolls[i].options.length > 2) {
                              newPolls[i].options.splice(j, 1);
                              setPolls(newPolls);
                            }
                          }}
                        >
                          <FaRegTrashAlt />
                        </Button>
                      </div>
                    ))}

                    <div className="flex flex-row justify-center content-center gap-1 mt-1">
                      <Button
                        className="grow"
                        variant="ghost"
                        onClick={() => {
                          const newPolls = [...polls];
                          newPolls[i].options.push("");
                          setPolls(newPolls);
                        }}
                      >
                        <IoMdAdd size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {polls.length === 0 ? (
          <NewQuestionPlaceholder
            onClick={() => {
              setPolls([
                ...polls,
                {
                  id: polls.length.toString(),
                  body: "",
                  options: ["", ""],
                  ballotURL: 0,
                  createdAt: new Date(),
                  expiry: new Date()
                }
              ]);
            }}
          />
        ) : (
          <div className="flex flex-row justify-center content-center gap-1 my-2">
            <Button
              className="flex-grow"
              variant="ghost"
              onClick={() =>
                setPolls([
                  ...polls,
                  {
                    id: polls.length.toString(),
                    body: "",
                    options: ["", ""],
                    ballotURL: 0,
                    createdAt: new Date(),
                    expiry: new Date()
                  }
                ])
              }
            >
              Add Poll
            </Button>
          </div>
        )}
        {loadingVoterGroupUrl || serverLoading ? (
          <LoadingPlaceholder />
        ) : (
          <Button
            className="w-full"
            variant="creative"
            disabled={
              ballotTitle === "" ||
              polls.length === 0 ||
              polls.some((poll) => poll.body === "" || poll.options.length < 2)
            }
            onClick={createBallotPCD}
          >
            Create Ballot
          </Button>
        )}
      </div>
    </>
  );
}
