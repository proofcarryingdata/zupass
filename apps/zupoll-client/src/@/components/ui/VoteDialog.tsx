import { Dialog as HeadlessDialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Button } from "./button";

export default function VoteDialog({
  text,
  close,
  onVoted
}: {
  text: string;
  close: () => void;
  onVoted: () => void;
}) {
  return (
    <Transition.Root show={true} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-10" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <HeadlessDialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                <div>
                  {/* <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckIcon
                      className="h-6 w-6 text-green-600"
                      aria-hidden="true"
                    />
                  </div> */}
                  <div className="mt-3 text-center sm:mt-5">
                    <HeadlessDialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-foreground"
                    >
                      Vote
                    </HeadlessDialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-foreground">{text}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 flex flex-col gap-1">
                  <Button
                    variant={"creative"}
                    className="w-full"
                    onClick={onVoted}
                  >
                    Vote
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => close()}
                  >
                    Back
                  </Button>
                </div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition.Root>
  );
}

// const className =
//   "inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
