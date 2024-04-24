import { Dialog as HeadlessDialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Button } from "./button";

export interface ImportedQuestions {
  questions: string[];
}

export default function ImportDialog({
  show,
  text,
  close,
  onImported,
  submitButtonText
}: {
  show: boolean;
  text: string;
  close: () => void;
  onImported: (imported: ImportedQuestions) => void;
  submitButtonText: string;
}) {
  return (
    <Transition.Root show={show} as={Fragment}>
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
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <HeadlessDialog.Panel className="relative transform overflow-hidden rounded-lg bg-background px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <HeadlessDialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-foreground"
                    >
                      Vote
                    </HeadlessDialog.Title>
                    <div className="mt-2">
                      <p className="text-md text-foreground">{text}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 flex flex-col gap-1">
                  <Button
                    variant={"creative"}
                    className="w-full"
                    onClick={() => {
                      onImported({
                        questions: ["XD"]
                      });
                    }}
                  >
                    {submitButtonText}
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
