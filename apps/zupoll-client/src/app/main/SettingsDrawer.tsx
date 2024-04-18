import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import { IoMdSettings } from "react-icons/io";

export function SettingsDrawer() {
  return (
    <>
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant={"ghost"}>
            <IoMdSettings />
          </Button>
        </DrawerTrigger>

        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Settings</DrawerTitle>
          </DrawerHeader>
          <div className="m-4 w-full">
            <ThemeSwitcher />
          </div>
          <DrawerFooter>
            <DrawerClose>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
