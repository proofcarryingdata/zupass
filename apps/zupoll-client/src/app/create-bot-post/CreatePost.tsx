import { useState } from "react";
import styled from "styled-components";
import { Button } from "../../@/components/ui/button";
import { BotPostRequest } from "../../api/requestTypes";
import { LoginState, ZupollError } from "../../types";
import { botPost } from "../../zupoll-server-api";

/**
 * Page hosted on /create-post to directly post to the @zupoll_bot account.
 * This is necessary as we can't host two instances of the bot on different
 * servers, so we directly feed messages into the bot being hosted on
 * zupoll-server.
 */
export function CreatePost({
  onError,
  loginState
}: {
  onError: (err: ZupollError) => void;
  loginState: LoginState;
}) {
  const [text, setText] = useState("");

  const handleChangeText = (event: any) => {
    setText(event.target.value);
  };

  async function doTextRequest() {
    if (!confirm("Are you sure you want to post this?") === false) return;

    if (text === undefined) return;

    const request: BotPostRequest = {
      message: text
    };
    const res = await botPost(request, loginState.token);

    if (res === undefined) {
      const serverDownError: ZupollError = {
        title: "Post failed",
        message: "Server is down. Contact support@zupass.org."
      };
      onError(serverDownError);
      return;
    }

    if (!res.ok) {
      const resErr = await res.text();
      console.error("error posting: ", resErr);
      const err: ZupollError = {
        title: "Posting failed",
        message: `Server Error: ${resErr}`
      };
      onError(err);
      return;
    }

    setText("");
  }

  return (
    <InputWrapper>
      <InputHeader>Create post from @zupoll_bot</InputHeader>
      <InputBody value={text} onChange={handleChangeText} />
      <Button onClick={doTextRequest}>Post</Button>
    </InputWrapper>
  );
}

const InputWrapper = styled.div`
  box-sizing: border-box;
  font-family: OpenSans;
  border: 1px solid #bbb;
  background-color: #eee;
  width: 100%;
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 1rem;
  position: relative;
  transition: 200ms;

  &:hover {
    background-color: #f8f8f8;
  }
`;

const InputHeader = styled.div`
  padding: 0px;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-weight: 700;
`;

const InputBody = styled.textarea`
  width: 100%;
  height: 10rem;
  margin-bottom: 0.5rem;
`;
