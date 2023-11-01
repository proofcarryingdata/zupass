import moment from "moment";
import React from "react";

interface PostProps {
  title: string;
  content: string;
  timestamp: string;
}

const Post: React.FC<PostProps> = ({ title, content, timestamp }) => {
  return (
    <div className="flex flex-col border border-black border-opacity-10 rounded-lg p-4">
      <div className="text-[#037EE5] flex items-center justify-between mb-2">
        <span>{title}</span>
        <span className="opacity-40">{moment(timestamp).fromNow(true)}</span>
      </div>
      <span className="text-[#2e2e35]">{content}</span>
    </div>
  );
};

export default Post;
