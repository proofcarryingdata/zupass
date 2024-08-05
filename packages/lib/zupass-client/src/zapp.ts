import { z } from "zod";

export const ZappSchema = z.object({
  name: z.string(),
  permissions: z.array(z.string())
});

export type Zapp = z.infer<typeof ZappSchema>;
