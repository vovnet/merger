export interface LeaderboardEntry {
  rank: number;
  score: number;
  name: string;
  uniqueId: string;
  avatarUrl: string;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  userRank: number | null;
}
