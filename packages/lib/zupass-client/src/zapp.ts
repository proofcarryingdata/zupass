import { z } from "zod";

const ZappPermission = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("readFromFolder"),
    path: z.string(),
    recursive: z.boolean()
  }),
  z.object({
    type: z.literal("writeToFolder"),
    path: z.string(),
    recursive: z.boolean()
  })
]);

export const ZappSchema = z.object({
  name: z.string(),
  permissions: z.array(z.string())
});

export type Zapp = z.infer<typeof ZappSchema>;
