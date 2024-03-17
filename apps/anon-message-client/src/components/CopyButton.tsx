import React, { useState } from "react";

interface CopyButtonProps {
  link: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ link }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copyLink = (): void => {
    navigator.clipboard.writeText(link);
  };

  return (
    <button
      className="justify-center w-full flex items-center rounded-lg bg-white text-[#50acf9] px-6 py-2 cursor-pointer mx-auto font-medium shadow-sm"
      onClick={(): void => {
        copyLink();
        setCopied(true);
      }}
    >
      {copied ? "Link copied!" : "Copy link"}
    </button>
  );
};

export default CopyButton;
