import { Dialog as HeadlessDialog, Transition } from "@headlessui/react";
import { getErrorMessage } from "@pcd/util";
import { parse } from "csv-parse/sync";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ObjectOption } from "../../../api/prismaTypes";
import { Button } from "./button";
import { Input } from "./input";

export interface ImportedQuestions {
  questions: string[];
}

interface DevfolioRow {
  "Project Name": string;
  URL: string;
}

async function parseInput(csv: string): Promise<ImportedQuestions | undefined> {
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true
  }) as DevfolioRow[];
  return {
    questions: records.map((r) =>
      JSON.stringify({
        text: r["Project Name"],
        externalLink: r.URL
      } satisfies ObjectOption)
    )
  };
}

export default function ImportDialog({
  show,
  close,
  onImported
}: {
  show: boolean;
  close: () => void;
  onImported: (imported: ImportedQuestions) => void;
}) {
  const [fileInput, setFileInput] = useState<HTMLInputElement>();
  const [csvFileValue, setCsvFileValue] = useState<string>();
  const [parsedQuestions, setParsedQuestions] = useState<ImportedQuestions>();

  useEffect(() => {
    if (csvFileValue) {
      parseInput(csvFileValue)
        .then((result) => {
          setParsedQuestions(result);
        })
        .catch((e) => {
          alert("failed to parse csv file: s" + getErrorMessage(e));
        });
    }
  }, [csvFileValue]);

  const onInputChange = useCallback(() => {
    const file = fileInput?.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", (ev) => {
      if (typeof reader.result === "string") {
        setCsvFileValue(reader.result);
      } else {
        alert("failed to read csv file - couldn't read as a string");
      }
    });

    reader.addEventListener("error", (e) => {
      alert("failed to read csv file - " + getErrorMessage(e));
    });

    reader.readAsText(file);
  }, [fileInput]);

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
                      Import Questions
                    </HeadlessDialog.Title>
                    <div className="mt-2">
                      <p className="text-md text-foreground">
                        Import questions from a CSV file
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 flex flex-col gap-1">
                  <Input
                    ref={(instance) => setFileInput(instance ?? undefined)}
                    accept=".csv"
                    type="file"
                    onChange={onInputChange}
                  />
                  <Button
                    variant={"creative"}
                    className="w-full"
                    disabled={!parsedQuestions}
                    onClick={() => {
                      if (parsedQuestions) {
                        onImported(parsedQuestions);
                      }
                    }}
                  >
                    Import
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
