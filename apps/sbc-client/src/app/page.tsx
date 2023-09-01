export default function EventPage() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-200">
      <a
        href="https://t.me/testing_for_merklehub_bot?start=verify"
        target="_blank"
      >
        <div className="flex flex-col bg-white shadow-md rounded px-8 py-8 gap-6">
          <h1 className="text-gray-700 text-xl font-bold">
            Welcome to SBC 🧱!
          </h1>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
            Login with Telegram
          </button>
        </div>
      </a>
    </div>
  );
}
