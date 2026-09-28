export type RewardType = "RANK_SQUISH" | "COINS" | "ITEM";

export interface RewardData {
  type: RewardType;
  level?: number;
  rank?: number;
  amount?: number;
  itemId?: string;
}
