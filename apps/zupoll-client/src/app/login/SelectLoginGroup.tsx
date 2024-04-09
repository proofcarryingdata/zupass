import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Dispatch, SetStateAction } from "react";
import { ConfigGroupName, LoginConfig } from "../../types";

export function SelectLoginGroup({
  selectedGroup,
  setSelectedGroup,
  groups
}: {
  selectedGroup: ConfigGroupName | undefined;
  setSelectedGroup: Dispatch<SetStateAction<ConfigGroupName | undefined>>;
  groups: [string, LoginConfig[]][];
}) {
  return (
    <Select
      value={selectedGroup}
      onValueChange={(v) => setSelectedGroup(v as ConfigGroupName)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select your Event" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {groups.map((g) => {
            return (
              <SelectItem key={g[0]} value={g[0]}>
                {g[0]}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
