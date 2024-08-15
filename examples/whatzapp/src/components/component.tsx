/**
 * v0 by Vercel.
 * @see https://v0.dev/t/SAuKCRtL6O8
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useEmbeddedZupass } from "@/hooks/useEmbeddedZupass";
import { PODPCD } from "@pcd/pod-pcd";
import { bigIntToPseudonymEmoji, bigIntToPseudonymName } from "@pcd/util";
import jsAgo from "js-ago";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { FaChevronLeft, FaPlus } from "react-icons/fa";

type Action = { type: "ADD_CONVERSATION"; payload: string };

function conversationsReducer(state: string[], action: Action): string[] {
  switch (action.type) {
    case "ADD_CONVERSATION":
      return [...state, action.payload];
    default:
      return state;
  }
}

function AddNewChat({ onAdd }: { onAdd: (id: string) => void }) {
  const [id, setId] = useState<string>("");
  return (
    <Dialog>
      <DialogTrigger>
        <FaPlus className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Chat</DialogTitle>
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              placeholder="Enter the recipient's ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
            <Button onClick={() => onAdd(id)}>Add</Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function ChatTab({
  id,
  lastMessageText,
  lastMessageTime,
  selected,
  onSelect
}: {
  id: string;
  lastMessageText: string;
  lastMessageTime: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const timeAgo =
    lastMessageTime !== ""
      ? jsAgo(new Date(Number(lastMessageTime)))
      : "Just started!";
  return (
    <div
      onClick={() => onSelect(id)}
      className={`px-4 py-3 ${
        selected
          ? "bg-gray-300 dark:bg-gray-700"
          : "hover:bg-gray-200 dark:hover:bg-gray-800"
      } cursor-pointer flex items-center gap-4`}
    >
      <Avatar className="w-10 h-10">
        <AvatarFallback>{bigIntToPseudonymEmoji(BigInt(id))}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="font-semibold text-sm">
          {bigIntToPseudonymName(BigInt(id))}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
          {lastMessageText}
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</div>
    </div>
  );
}

function SentMessage({ message }: { message: PODPCD }) {
  const { timestamp, message: messageText } = message.claim.entries;
  return (
    <div className="flex items-end gap-2 justify-end">
      <div className="bg-primary text-white rounded-lg p-3 max-w-[70%]">
        <div className="text-sm">{messageText.value.toString()}</div>
        <div className="text-xs text-gray-200 mt-1">
          {jsAgo(new Date(Number(timestamp.value)))}
        </div>
      </div>
    </div>
  );
}

function ReceivedMessage({ message }: { message: PODPCD }) {
  const { sender, timestamp, message: messageText } = message.claim.entries;
  return (
    <div className="flex items-end gap-2">
      <Avatar className="w-8 h-8">
        <AvatarFallback>
          {bigIntToPseudonymEmoji(BigInt(sender.value))}
        </AvatarFallback>
      </Avatar>
      <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-3 max-w-[70%]">
        <div className="font-medium text-sm">
          {bigIntToPseudonymName(BigInt(sender.value))}
        </div>
        <div className="text-sm">{messageText.value.toString()}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {jsAgo(new Date(Number(timestamp.value)))}
        </div>
      </div>
    </div>
  );
}

function CurrentChat({
  otherId,
  conversation,
  myId,
  onClose
}: {
  otherId: string;
  conversation: PODPCD[];
  myId: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState<string>("");
  const { z, connected } = useEmbeddedZupass();

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  if (!connected) {
    return null;
  }

  return (
    <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex items-center h-[60px] border-b border-gray-200 dark:border-gray-800 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={onClose}
        >
          <FaChevronLeft className="h-4 w-4" />
        </Button>
        <Avatar className="w-8 h-8">
          <AvatarFallback>
            {bigIntToPseudonymEmoji(BigInt(otherId))}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3 flex-1">
          <div className="font-semibold text-sm">
            {bigIntToPseudonymName(BigInt(otherId))}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Online</div>
        </div>
        <div className="flex items-center gap-2">
          {/* <Button variant="ghost" size="icon" className="w-8 h-8">
            <PhoneCallIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <VideoIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <MenuIcon className="h-4 w-4" />
          </Button> */}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-4">
          {conversation
            .filter(
              (message) =>
                message.claim.entries.message.value.toString().length > 0
            )
            .map((message) => {
              return message.claim.entries.sender.value.toString() === myId ? (
                <SentMessage key={message.id} message={message} />
              ) : (
                <ReceivedMessage key={message.id} message={message} />
              );
            })}
          <div ref={ref} />
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type your message..."
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-full px-4 py-2 text-sm flex-1"
            onChange={(e) => setMessage(e.target.value)}
            value={message}
          />
          {/* <Button variant="ghost" size="icon" className="w-8 h-8">
            <PaperclipIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <MicIcon className="h-4 w-4" />
          </Button> */}
          <Button
            className="rounded-full px-4 py-2 text-sm"
            onClick={async () => {
              await fetch(`/api/send`, {
                method: "POST",
                body: JSON.stringify({
                  message,
                  sender: myId,
                  recipient: otherId
                })
              });
              setMessage("");
              await z.feeds.pollFeed(`${window.location.origin}/api/feed`, "1");
            }}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Component({
  myId,
  conversations
}: {
  myId: string;
  conversations: Map<string, PODPCD[]>;
}) {
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);

  const { toast } = useToast();

  const [newConversations, dispatch] = useReducer(conversationsReducer, []);

  const allConversations = useMemo(() => {
    const emptyConversations = new Map(
      newConversations
        .filter((id) => !conversations.has(id))
        .map((id) => [id, [] as PODPCD[]])
    );
    return new Map([...emptyConversations, ...conversations]);
  }, [conversations, newConversations]);

  return (
    <div className="flex h-screen max-h-screen w-full max-w-[1200px] mx-auto overflow-hidden">
      <div
        className={`bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 w-full md:w-[300px] flex flex-col overflow-hidden ${
          selectedConversation ? "hidden md:block" : ""
        }`}
      >
        <div className="flex items-center h-[60px] border-b border-gray-200 dark:border-gray-800 px-4">
          <Avatar
            onClick={() => {
              navigator.clipboard.writeText(myId);
              toast({
                title: "Copied!",
                description: "Your ID has been copied to your clipboard."
              });
            }}
            className="w-8 h-8 cursor-pointer"
          >
            <AvatarFallback>
              {bigIntToPseudonymEmoji(BigInt(myId))}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1">
            <div className="font-semibold text-sm">
              {bigIntToPseudonymName(BigInt(myId))}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Online
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* <Button variant="ghost" size="icon" className="w-8 h-8">
              <SearchIcon className="h-4 w-4" />
            </Button> */}
            <AddNewChat
              onAdd={(id) =>
                dispatch({ type: "ADD_CONVERSATION", payload: id })
              }
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {/* <div className="px-4 py-3">
            <Input
              type="search"
              placeholder="Search or start new chat"
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-full px-4 py-2 text-sm"
            />
          </div> */}
          <div className="space-y-2">
            {[...allConversations.entries()].map(([id, conversation]) => (
              <ChatTab
                key={id}
                id={id}
                selected={selectedConversation === id}
                lastMessageText={
                  conversation[
                    conversation.length - 1
                  ]?.claim.entries.message.value.toString() ?? ""
                }
                lastMessageTime={
                  conversation[
                    conversation.length - 1
                  ]?.claim.entries.timestamp.value.toString() ?? ""
                }
                onSelect={setSelectedConversation}
              />
            ))}
          </div>
        </div>
      </div>
      {selectedConversation && allConversations.size > 0 && (
        <CurrentChat
          conversation={allConversations.get(selectedConversation) as PODPCD[]}
          myId={myId}
          otherId={selectedConversation}
          onClose={() => setSelectedConversation(null)}
        />
      )}
      <Toaster />
    </div>
  );
}

function CheckCheckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7.5 7.5L13 16" />
    </svg>
  );
}

function MenuIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function MicIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function PaperclipIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function PhoneCallIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      <path d="M14.05 2a9 9 0 0 1 8 7.94" />
      <path d="M14.05 6A5 5 0 0 1 18 10" />
    </svg>
  );
}

function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function VideoIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}
