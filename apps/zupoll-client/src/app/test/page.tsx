"use client";

import { Center, ContentContainer } from "@/components/ui/Elements";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function TestPage() {
  return (
    <Center>
      <ContentContainer className="mt-4 flex columns-1 gap-0">
        <Spinner className="w-12 h-12 m-2" />
        <Button variant="default">default</Button>
        <Button variant="destructive">destructive</Button>
        <Button variant="ghost">ghost</Button>
        <Button variant="outline">outline</Button>
        <Button variant="link">link</Button>
        <Button variant="secondary">secondary</Button>
        <Button variant="accent">accent</Button>
        <Button variant="warning">warning</Button>
        <Button variant="creative">creative</Button>
      </ContentContainer>
    </Center>
  );
}
