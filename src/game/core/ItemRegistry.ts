export class ItemRegistry {
  private static readonly TOTAL_FRAMES = 72;

  static getFrameName(level: number): string {
    const frameIndex = ((level - 1) % this.TOTAL_FRAMES) + 1;
    return String(frameIndex);
  }

  static getMaxLevel(): number {
    return this.TOTAL_FRAMES;
  }
}
