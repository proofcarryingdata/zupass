export const ESMERALDA_TICKET_TYPES = [
  "65f21e95e0530c54c60b7e83 (Standard- Full time)",
  "65f220791faee5bf9ebd2e9e (Patron- Full Time)",
  "65f220d8e0530c54c60b8082 (Scholar- Full Time)",
  "65f221da1faee5bf9ebd2f31 (Standard- Week 1)",
  "65f223bbe0530c54c60b8185 (Builder- All Weekend Pass)",
  "65ffb12f6d97cb333366d663 (Standard- Week 2)",
  "65ffb1816d97cb333366d688 (Standard- Week 3)",
  "65ffb1b56d97cb333366d69a (Standard- Week 4)",
  "65ffb3106d97cb333366d702 (Builder- Week 1)",
  "65ffb3976d97cb333366d721 (Builder- Week 2)",
  "65ffb3d86d97cb333366d733 (Builder- Week 3)",
  "65ffb765a1937a7f15307cf6 (Standard - Week 1 & 2)",
  "65ffb798a1937a7f15307d1c (Standard - Week 2 & 3)",
  "65ffb7c0a1937a7f15307d2d (Standard - Week 3 & 4)",
  "65ffbc43a1937a7f15307fdc (Standard- All Weekend Pass)",
  "65ffc394a1937a7f153085ba (Standard - Weekend 1)",
  "65ffc3f56d97cb333366debf (Standard- Weekend 2)",
  "66032c96b7969c9471ba7486 (+1 Resident- Full Time)",
  "6603312f8899f4bf586b66e2 (Scholar - Week 1 & 2)",
  "6603316ab7969c9471ba7adb (Scholar- Week 2 & 3)",
  "66033264b7969c9471ba7be9 (+1 Resident- Week 1)",
  "6603351e8899f4bf586b6c3f (+1 Resident- Week 2)",
  "66033572b7969c9471ba82a5 (+1 Resident- Week 3)",
  "660335acb7969c9471ba82da (+1 Resident- Week 4)",
  "660335bf8899f4bf586b6e3b (Scholar- Week 3 & 4)",
  "660336208899f4bf586b6eb9 (+1 Resident- Week 1 & 2)",
  "6603363e8899f4bf586b6ef1 (+1 Resident-  Week 2 & 3)",
  "66033661b7969c9471ba835f (+1 Resident- Week 3 & 4)",
  "660336848899f4bf586b6f4d (+1 Resident- Weekend 1)",
  "660336a98899f4bf586b6fa5 (+1 Resident- Weekend 2)",
  "660336c5b7969c9471ba83c4 (+1 Resident- Weekend 3)",
  "660336db8899f4bf586b6fc5 (+1 Resident- Weekend 4)",
  "66033765b7969c9471ba8422 (+1 Resident- All Weekend Pass)",
  "6603391db7969c9471ba8567 (Standard- Weekend 3)",
  "660339528899f4bf586b7310 (Standard- Weekend 4)",
  "66033a9b8899f4bf586b7458 (Child- Full Time)",
  "66033abab7969c9471ba86b0 (Child- Week 1 & 2)",
  "66033b058899f4bf586b74a5 (Child- Week 2 & 3)",
  "66033b1db7969c9471ba86d9 (Builder- Week 4)",
  "66033b1eb7969c9471ba86df (Child- Week 3 & 4)",
  "66033b478899f4bf586b74d3 (Child- Week 1)",
  "66033b6db7969c9471ba86f2 (Builder- Week 1 & 2)",
  "66033ba48899f4bf586b7522 (Child- Week 2)",
  "66033bbab7969c9471ba870b (Child- Week 3)",
  "66033bc1b7969c9471ba8710 (Builder- Week 2 & 3)",
  "66033be18899f4bf586b7548 (Child- Week 4)",
  "66033bf48899f4bf586b7554 (Builder- Week 3 & 4)",
  "66033c07b7969c9471ba8735 (Child- Weekend 1)",
  "66033c25b7969c9471ba873f (Child- Weekend 2)",
  "66033c528899f4bf586b7592 (Child- Weekend 3)",
  "66033c8a8899f4bf586b75ae (Child- Weekend 4)",
  "66033e228899f4bf586b7708 (Patron- Week 1 & 2)",
  "66033e44b7969c9471ba880f (Patron- Week 2 & 3)",
  "66033e70b7969c9471ba881e (Patron- Week 3 & 4)",
  "66033ecb8899f4bf586b7761 (Patron- Week 1)",
  "66033f7cb7969c9471ba887f (Patron- Week 2)",
  "66033fa5b7969c9471ba8885 (Patron- Week 3)",
  "66033fde8899f4bf586b77f8 (Patron- Week 4)",
  "66046b1577c783f0fbd5bf65 (Patron- Weekend 1)",
  "66046b3b77c783f0fbd5bfa4 (Patron- Weekend 2)",
  "66046b5177c783f0fbd5bfce (Patron- Weekend 3)",
  "66046b7277c783f0fbd5bfdf (Patron- Weekend 4)",
  "66046b9977c783f0fbd5c021 (Patron- All Weekends)",
  "66046bd130afd59a5df76c94 (Child- All Weekends)",
  "66119553987aa2df1bba8c09 (Builder- Full Time)"
];

interface ParsedResult {
  id: string;
  name: string;
}

export function parseTicketTypeEntry(input: string): ParsedResult | null {
  const regex = /^([a-f0-9]{24}) \((.+)\)$/;
  const match = input.match(regex);

  if (match) {
    return {
      id: match[1],
      name: cleanupName(match[2])
    };
  }

  return null;
}

export function cleanupName(name: string): string {
  return name.replace("-", " -");
}
