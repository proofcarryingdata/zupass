import { useCallback, useState } from "react";
import { useDispatch, useQuery } from "../../src/appHooks";
import { BigInput, Button } from "../core";

export function EnterConfirmationCodeScreen() {
  const dispatch = useDispatch();
  const query = useQuery();

  const email = query?.get("email");
  const identityCommitment = query?.get("identityCommitment");

  const [verifyingCode, setVerifyingCode] = useState(false);
  const [input, setInput] = useState("");

  alert(email);

  const onOverwriteClick = useCallback(async () => {
    const token = input;
    setVerifyingCode(true);
    await dispatch({ type: "login", email, token });
    setVerifyingCode(false);
  }, [dispatch, email, input]);

  const onNeverMindClick = useCallback(() => {
    window.location.href = "#/";
  }, []);

  return (
    <div>
      enter confirmation code
      <BigInput value={input} onChange={(e) => setInput(e.target.value)} />
      <Button onClick={onOverwriteClick} style="danger">
        test
      </Button>
      <Button onClick={onNeverMindClick}>never mind</Button>
    </div>
  );
}
