import React from "react";

interface PostProps {
  title: string;
  content: string;
  timestamp: string;
}

// from: https://github.com/dcposch/zucast/blob/master/src/components/PostBox.tsx
function formatTime(timeMs: number) {
  const secsAgo = Math.floor((Date.now() - timeMs) / 1000);
  if (secsAgo < 60) return "Now";
  if (secsAgo < 60 * 60) return `${Math.floor(secsAgo / 60)}m`;
  if (secsAgo < 60 * 60 * 24) return `${Math.floor(secsAgo / 60 / 60)}h`;
  return `${Math.floor(secsAgo / 60 / 60 / 24)}d`;
}

const Post: React.FC<PostProps> = ({ title, content, timestamp }) => {
  return (
    <div className="flex flex-col border border-black border-opacity-10 rounded-lg p-4">
      <div className="text-[#037EE5] flex items-center justify-between mb-2">
        <span>{title}</span>
        <span className="opacity-40">
          {formatTime(new Date(timestamp).getTime())}
        </span>
      </div>
      <span className="text-[#2e2e35]">{content}</span>
    </div>
  );
};

export default Post;
