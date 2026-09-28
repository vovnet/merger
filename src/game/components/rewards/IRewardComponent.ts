export interface IRewardComponent {
  build(centerX: number, centerY: number): void;
  playAppearAnimation(): void;
  playIdleAnimation(): void;
  destroy(): void;
}
