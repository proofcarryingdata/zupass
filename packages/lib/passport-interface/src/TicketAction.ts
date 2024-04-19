export interface PodboxTicketAction {
  checkin?: boolean;
  getContact?: boolean;
  giftBadge?: {
    badgeIds: string[];
  };
}
