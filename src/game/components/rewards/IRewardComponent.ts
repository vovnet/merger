export interface IRewardComponent {
  build(centerX: number, centerY: number): void;
  playAppearAnimation(): number;
  playIdleAnimation(): void;
  destroy(): void;
}
