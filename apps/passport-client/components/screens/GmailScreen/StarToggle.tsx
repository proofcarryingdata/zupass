import { ReactNode, useState } from "react";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";

export function StarToggle({
  initialState = false,
  onToggle
}: {
  initialState?: boolean;
  onToggle?: (isStarred: boolean) => void;
}): ReactNode {
  const [isStarred, setIsStarred] = useState(initialState);

  const handleToggle = (): void => {
    const newState = !isStarred;
    setIsStarred(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  return (
    <button onClick={handleToggle} className="focus:outline-none">
      {isStarred ? (
        <AiFillStar className="text-yellow-400 text-xl" />
      ) : (
        <AiOutlineStar className="text-gray-400 text-xl hover:text-yellow-400" />
      )}
    </button>
  );
}
