export default function Loading(): JSX.Element {
  return (
    <div className="flex flex-col items-center bg-white p-4">
      <div className="flex items-center justify-center p-2 w-full">
        <span className="font-bold text-[#2e2e35]">ZK-TG</span>
      </div>
      <div className="flex flex-col gap-2 items-center">
        <div className="flex flex-col items-center">
          <div className="h-[40px] w-[40px] bg-slate-200 rounded animate-pulse"></div>
          <span className="text-[#2E2E35] font-bold text-xl animate-pulse">
            Anonymous Loader
          </span>
        </div>
        <span className="font-mono text-[#2e2e35] opacity-30 animate-pulse">
          #####
        </span>
      </div>
      <div className="flex flex-col gap-2 mt-4 w-full">
        {[...Array(5)].map((_message: unknown, i: number) => (
          <div
            className="w-full flex flex-col border border-black border-opacity-10 rounded-lg p-4 animate-pulse"
            key={i}
          >
            <div className="w-full flex items-center justify-between mb-2">
              <div className="w-full h-[20px] bg-slate-200 rounded animate-pulse"></div>
            </div>

            <div className="w-full h-[20px] bg-slate-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
