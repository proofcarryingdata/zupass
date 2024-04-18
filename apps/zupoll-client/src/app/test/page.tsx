"use client";

import { Screen } from "@/components/ui/Elements";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function TestPage() {
  return (
    <>
      <Screen>
        <div className="m-8 flex flex-col gap-2 w-[500px]">
          <ThemeSwitcher />
          <div className="flex justify-center items-center">
            <Spinner className="w-10 h-10 m-2" />
          </div>
          <Button variant="default">default</Button>
          <Button variant="secondary">secondary</Button>
          <Button variant="destructive">destructive</Button>
          <Button variant="warning">warning</Button>
          <Button variant="creative">creative</Button>
          <Button variant="outline">outline</Button>
          <Button variant="ghost">ghost</Button>
          <Button variant="link">link</Button>
        </div>
      </Screen>
    </>
  );
}
