import { bigintToPseudonym } from "@pcd/util";

export default function Page({ params }: { params: { nullifier: string } }) {
  return (
    <div className="w-screen h-screen flex flex-col items-center bg-[#037EE5] p-4">
      <span className="text-white font-bold my-4 text-xl">
        {bigintToPseudonym(BigInt(params.nullifier))}
      </span>
      <div>
        <span className="text-white font-bold my-4">Posts</span>
      </div>
    </div>
  );
}
