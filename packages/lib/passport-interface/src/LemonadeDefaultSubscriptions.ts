import { Feed, LemonadeFeedIds } from "./SubscriptionManager";

export const lemonadeDefaultSubscriptions: Record<
  LemonadeFeedIds.EdgeCityDenver,
  Feed
> = {
  [LemonadeFeedIds.EdgeCityDenver]: {
    id: LemonadeFeedIds.EdgeCityDenver,
    name: "Lemonade",
    description: "Your tickets at Lemonade 🍋",
    permissions: [
      {
        folder: "Lemonade",
        type: "ReplaceInFolder_permission"
      },
      {
        folder: "Lemonade",
        type: "DeleteFolder_permission"
      }
    ],
    credentialRequest: {
      signatureType: "sempahore-signature-pcd",
      pcdType: "email-pcd"
    }
  }
};
