import Post from "@/components/post";
import { bigIntToPseudonymEmoji, bigIntToPseudonymName } from "@pcd/util";

interface AnonMessageWithDetails {
  id: number;
  nullifier: string;
  chat_topic_id: number;
  content: string;
  proof: string;
  chat_name: string;
  topic_name: string;
  message_timestamp: string;
}

export default async function Page({
  params
}: {
  params: { nullifier: string };
}) {
  const getData = async (): Promise<AnonMessageWithDetails[]> => {
    const data = await fetch(
      `${process.env.NEXT_PUBLIC_PASSPORT_SERVER_URL}/telegram/anonget/${params.nullifier}`,
      { cache: "no-store" }
    );
    const dataJson = await data.json();
    return dataJson;
  };

  const messages = await getData();

  return (
    <div className="flex flex-col items-center bg-white p-4">
      <div className="flex items-center justify-center p-2 w-full">
        <span className="font-bold text-[#2e2e35]">ZK-TG</span>
      </div>
      <div className="flex flex-col gap-2 items-center">
        <div className="flex flex-col items-center">
          <span className="text-4xl mb-1">
            {bigIntToPseudonymEmoji(BigInt(params.nullifier))}
          </span>
          <span className="text-[#2E2E35] font-bold text-xl">
            {bigIntToPseudonymName(BigInt(params.nullifier))}
          </span>
        </div>
        <span className="font-mono text-[#2e2e35] opacity-30">
          #{params.nullifier.substring(0, 4)}
        </span>
      </div>
      {messages.length === 0 ? (
        <div className="flex flex-col items-center mt-4">
          <span className="text-[#2e2e35] opacity-30 text-xl ">
            No messages ... yet
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {messages
            .sort(
              (a, b) =>
                new Date(b.message_timestamp).getTime() -
                new Date(a.message_timestamp).getTime()
            )
            .map((message: AnonMessageWithDetails, i: number) => (
              <Post
                title={message.chat_name}
                content={message.content}
                key={i}
                timestamp={message.message_timestamp}
              />
            ))}
        </div>
      )}
    </div>
  );
}
