import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { LoginCategory } from "@pcd/zupoll-shared";
import groupBy from "lodash/groupBy";
import { Dispatch, SetStateAction } from "react";
import { LoginGroup } from "../../api/loginGroups";

/**
 * Allows a user that is logging in to choose:
 * - which event they want to log in for
 * - which group in the event they want to log in as
 * @todo create some better ux for logging in.
 */
export function SelectLoginGroup({
  selectedGroup,
  setSelectedGroup,
  groups,
  loading
}: {
  selectedGroup: LoginCategory | undefined;
  setSelectedGroup: Dispatch<SetStateAction<LoginCategory | undefined>>;
  groups: LoginGroup[];
  loading: boolean;
}) {
  return (
    <Select
      disabled={loading}
      value={selectedGroup}
      onValueChange={(v) => setSelectedGroup(v as LoginCategory)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a Group to Log In" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupBy(groups, (g: LoginGroup) => g.configs[0].year))
          .sort((lhs, rhs) => {
            return (
              new Date(
                rhs[1][0].configs[0].year,
                rhs[1][0].configs[0].month,
                rhs[1][0].configs[0].day
              ).getTime() -
              new Date(
                lhs[1][0].configs[0].year,
                lhs[1][0].configs[0].month,
                lhs[1][0].configs[0].day
              ).getTime()
            );
          })
          .map(([year, group]: [string, LoginGroup[]]) => {
            return (
              <SelectGroup key={year}>
                {group
                  .sort((lhs, rhs) => {
                    return (
                      new Date(
                        rhs.configs[0].year,
                        rhs.configs[0].month,
                        rhs.configs[0].day
                      ).getTime() -
                      new Date(
                        lhs.configs[0].year,
                        lhs.configs[0].month,
                        lhs.configs[0].day
                      ).getTime()
                    );
                  })
                  .map((g) => {
                    return (
                      <SelectItem
                        key={g.category}
                        value={g.category}
                        className="child cursor-pointer"
                      >
                        {g.category}
                      </SelectItem>
                    );
                  })}
              </SelectGroup>
            );
          })}
      </SelectContent>
    </Select>
  );
}
