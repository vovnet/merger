export type RewardType = "RANK_SQUISH" | "COINS" | "RARE_SQUISH";

export interface RewardData {
  type: RewardType;
  level?: number;
  rank?: number;
  amount?: number;
  itemId?: string;
}
