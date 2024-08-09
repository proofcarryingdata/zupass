import { ReactNode } from "react";
import { FaArrowLeft } from "react-icons/fa";

export function BackButton({ onClick }: { onClick: () => void }): ReactNode {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-center text-gray-600 hover:bg-gray-400 cursor-pointer m-2 active:bg-gray-500 transition-colors duration-200 active:text-white"
      style={{
        borderRadius: "50%",
        width: "28px",
        minWidth: "28px",
        maxWidth: "28px",
        height: "28px",
        minHeight: "28px",
        maxHeight: "28px"
      }}
    >
      <FaArrowLeft size={12} />
    </div>
  );
}
