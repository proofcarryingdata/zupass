import { ITicketData } from "@pcd/eddsa-ticket-pcd";
import { EdDSATicketFieldsToReveal } from "@pcd/zk-eddsa-event-ticket-pcd";
import { zuAuthPopup } from "@pcd/zuauth";
import { useCallback, useEffect, useState } from "react";
import { HomeLink } from "../../../components/Core";
import { ExampleContainer } from "../../../components/ExamplePage";
import { ZUPASS_CLIENT_URL_ENV } from "../../../constants";
import { generateWatermark, isLoggedIn, serverLogin } from "./utils";

export default function ZuAuth(): JSX.Element {
  const [fieldsToReveal, setFieldsToReveal] =
    useState<EdDSATicketFieldsToReveal>({
      revealTicketId: false,
      revealEventId: false,
      revealProductId: false,
      revealTimestampConsumed: false,
      revealTimestampSigned: false,
      revealAttendeeSemaphoreId: false,
      revealIsConsumed: false,
      revealIsRevoked: false,
      revealTicketCategory: false,
      revealAttendeeEmail: false,
      revealAttendeeName: false
    });

  const [authenticated, setAuthenticated] = useState<
    Partial<ITicketData> | false
  >(false);

  function toggleFieldToReveal(fieldName: string): void {
    setFieldsToReveal((prevState: EdDSATicketFieldsToReveal) => {
      const revealedFields = {
        ...prevState,
        [fieldName]: !(prevState as Record<string, boolean | undefined>)[
          fieldName
        ]
      };

      localStorage.setItem("fieldsToReveal", JSON.stringify(revealedFields));

      return revealedFields;
    });
  }

  useEffect(() => {
    (async function (): Promise<void> {
      setAuthenticated(await isLoggedIn());

      const savedFields = JSON.parse(
        localStorage.getItem("fieldsToReveal") ?? "{}"
      );

      if (savedFields) {
        setFieldsToReveal(savedFields);
      }
    })();
  }, []);

  const [configString, setConfigString] = useState("");

  const startAuth = useCallback(() => {
    (async (): Promise<void> => {
      const watermark = await generateWatermark();
      const config = JSON.parse(configString);
      const result = await zuAuthPopup({
        zupassUrl: ZUPASS_CLIENT_URL_ENV,
        fieldsToReveal,
        watermark,
        config: config
      });

      if (result.type === "pcd") {
        setAuthenticated(
          await serverLogin(result.pcdStr, config, fieldsToReveal)
        );
      }
    })();
  }, [fieldsToReveal, configString]);

  const logout = useCallback(() => {
    setAuthenticated(false);
  }, []);

  return (
    <div>
      <HomeLink />
      <>
        <h2>ZuAuth Example</h2>
        <p>An example of authenticating using ZuAuth.</p>
      </>
      <p>
        {authenticated ? "✅ Authenticated" : "✖️ Not authenticated"} {``}
      </p>

      {authenticated && (
        <ExampleContainer>
          <ul>
            {Object.entries(authenticated).map(([fieldName, value]) => (
              <li key={fieldName}>
                {fieldName}: {value}
              </li>
            ))}
          </ul>
        </ExampleContainer>
      )}
      <ExampleContainer>
        <div>
          {Object.keys(fieldsToReveal).map((fieldName) => (
            <div key={fieldName}>
              <label>
                <input
                  type="checkbox"
                  disabled={!!authenticated}
                  checked={
                    (fieldsToReveal as Record<string, boolean | undefined>)[
                      fieldName
                    ]
                  }
                  onChange={(): void => toggleFieldToReveal(fieldName)}
                />
                {fieldName}
              </label>
            </div>
          ))}
          <br />
          <label>
            ZuAuth configuration (find this in Podbox in the "ZuAuth
            Configuration" pipeline dashboard section).
          </label>
          <br />
          <textarea
            disabled={!!authenticated}
            cols={72}
            rows={8}
            value={configString}
            onChange={(e): void => {
              setConfigString(e.target.value);
            }}
          />
          <br />
          <br />
          <button
            onClick={() => {
              if (authenticated) {
                logout();
              } else {
                startAuth();
              }
            }}
          >
            {authenticated ? "Log out" : "Authenticate"}
          </button>
        </div>
      </ExampleContainer>
    </div>
  );
}
