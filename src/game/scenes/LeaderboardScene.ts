import * as Phaser from "phaser";
import { ygProvider } from "../../YGProvider";
import { LeaderboardData, LeaderboardEntry } from "../types/Leaderboard";
import { AlertButton } from "../ui/AlertButton";

export class LeaderboardScene extends Phaser.Scene {
  private contentContainer!: Phaser.GameObjects.Container;

  private readonly headerHeight = 120;
  private readonly ROW_HEIGHT = 64;
  private readonly ROW_WIDTH = 700;
  private readonly ROW_GAP = 6;

  private scrollY = 0;
  private minScroll = 0;
  private lastPointerY = 0;

  constructor() {
    super({ key: "LeaderboardScene" });
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    this.cameras.main.fadeIn(300, 0, 0, 0);

    // -------------------------------------------------------------------------
    // BACKGROUND
    // -------------------------------------------------------------------------

    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x1a1a2e).setOrigin(0).setDepth(0);

    // -------------------------------------------------------------------------
    // CONTENT
    // -------------------------------------------------------------------------

    this.contentContainer = this.add.container(0, 0).setDepth(1);

    this.showLoading();

    this.setupScrolling();

    // -------------------------------------------------------------------------
    // HEADER
    // -------------------------------------------------------------------------

    this.createHeader();

    // -------------------------------------------------------------------------
    // LOAD
    // -------------------------------------------------------------------------

    void this.loadLeaderboard();
  }

  // ===========================================================================
  // LOADING
  // ===========================================================================

  private async loadLeaderboard(): Promise<void> {
    try {
      const data = await ygProvider.getLeaderboard(10, 2);

      if (!data.entries.length) {
        this.showEmpty();
        return;
      }

      this.renderLeaderboard(data);
    } catch (error) {
      console.error("[LeaderboardScene] Failed to load leaderboard:", error);

      this.showError();
    }
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  private renderLeaderboard(data: LeaderboardData): void {
    this.contentContainer.removeAll(true);

    const entries = this.sortEntries(data.entries);

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    const centerX = screenWidth / 2;

    const rowWidth = Math.min(this.ROW_WIDTH, screenWidth - 40);

    let currentY = this.headerHeight + 20;
    let previousRank: number | null = null;

    for (const entry of entries) {
      // -----------------------------------------------------------------------
      // SEPARATOR
      // -----------------------------------------------------------------------

      if (previousRank !== null && entry.rank - previousRank > 1) {
        this.createSeparator(centerX, currentY);

        currentY += 40;
      }

      // -----------------------------------------------------------------------
      // ROW
      // -----------------------------------------------------------------------

      this.createEntryRow(entry, centerX, currentY, rowWidth, data.userRank);

      currentY += this.ROW_HEIGHT + this.ROW_GAP;

      previousRank = entry.rank;
    }

    // -------------------------------------------------------------------------
    // SCROLL BOUNDS
    // -------------------------------------------------------------------------

    const contentHeight = currentY - this.headerHeight;

    const viewHeight = screenHeight - this.headerHeight;

    this.minScroll = Math.min(0, viewHeight - contentHeight);

    // На случай повторного открытия / обновления.
    this.setScrollY(this.scrollY);
  }

  private createEntryRow(
    entry: LeaderboardEntry,
    centerX: number,
    y: number,
    rowWidth: number,
    userRank: number | null,
  ): void {
    const isCurrentUser = userRank !== null && entry.rank === userRank;

    const isTopThree = entry.rank <= 3;

    // -------------------------------------------------------------------------
    // BACKGROUND
    // -------------------------------------------------------------------------

    let backgroundColor = 0x24243a;

    if (isCurrentUser) {
      backgroundColor = 0x294b35;
    } else if (isTopThree) {
      backgroundColor = 0x302d1d;
    }

    const background = this.add
      .rectangle(centerX, y, rowWidth, this.ROW_HEIGHT, backgroundColor)
      .setOrigin(0.5);

    this.contentContainer.add(background);

    // -------------------------------------------------------------------------
    // RANK
    // -------------------------------------------------------------------------

    const rankColor = isCurrentUser ? 0x6cff8d : isTopThree ? 0xffd700 : 0xffffff;

    const rankText = this.add
      .bitmapText(centerX - rowWidth / 2 + 25, y, "russo", `${entry.rank}.`, 28)
      .setOrigin(0, 0.5)
      .setTint(rankColor);

    this.contentContainer.add(rankText);

    // -------------------------------------------------------------------------
    // NAME
    // -------------------------------------------------------------------------

    const displayName = isCurrentUser ? `YOU — ${entry.name}` : entry.name;

    const nameText = this.add
      .bitmapText(centerX - rowWidth / 2 + 80, y, "russo", displayName, 25)
      .setOrigin(0, 0.5)
      .setTint(isCurrentUser ? 0x6cff8d : 0xffffff);

    this.contentContainer.add(nameText);

    // -------------------------------------------------------------------------
    // SCORE
    // -------------------------------------------------------------------------

    const scoreText = this.add
      .bitmapText(centerX + rowWidth / 2 - 25, y, "russo", `${entry.score}`, 27)
      .setOrigin(1, 0.5)
      .setTint(0xa8e6ff);

    this.contentContainer.add(scoreText);
  }

  private createSeparator(centerX: number, y: number): void {
    const separator = this.add
      .bitmapText(centerX, y, "russo", "• • •", 22)
      .setOrigin(0.5)
      .setTint(0x777788);

    this.contentContainer.add(separator);
  }

  // ===========================================================================
  // STATES
  // ===========================================================================

  private showLoading(): void {
    this.contentContainer.removeAll(true);

    const text = this.add
      .bitmapText(this.scale.width / 2, this.headerHeight + 80, "russo", "ЗАГРУЗКА...", 30)
      .setOrigin(0.5)
      .setTint(0xa8e6ff);

    this.contentContainer.add(text);

    this.minScroll = 0;
    this.scrollY = 0;
  }

  private showEmpty(): void {
    this.contentContainer.removeAll(true);

    const text = this.add
      .bitmapText(this.scale.width / 2, this.headerHeight + 80, "russo", "ЛИДЕРБОРД ПОКА ПУСТ", 28)
      .setOrigin(0.5)
      .setTint(0xa8e6ff);

    this.contentContainer.add(text);

    this.minScroll = 0;
    this.scrollY = 0;
  }

  private showError(): void {
    this.contentContainer.removeAll(true);

    const text = this.add
      .bitmapText(
        this.scale.width / 2,
        this.headerHeight + 80,
        "russo",
        "НЕ УДАЛОСЬ ЗАГРУЗИТЬ ЛИДЕРБОРД",
        24,
      )
      .setOrigin(0.5)
      .setTint(0xff6666);

    this.contentContainer.add(text);

    this.minScroll = 0;
    this.scrollY = 0;
  }

  // ===========================================================================
  // SCROLLING
  // ===========================================================================

  private setupScrolling(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // -------------------------------------------------------------------------
    // MASK
    // -------------------------------------------------------------------------

    const maskShape = this.add.graphics();

    maskShape.fillStyle(0xffffff);

    maskShape.fillRect(0, this.headerHeight, screenWidth, screenHeight - this.headerHeight);

    // Сам Graphics на экране не нужен.
    maskShape.setVisible(false);

    this.contentContainer.enableFilters();

    if (this.contentContainer.filters) {
      this.contentContainer.filters.internal.addMask(maskShape);
    }

    // -------------------------------------------------------------------------
    // MOUSE WHEEL
    // -------------------------------------------------------------------------

    this.input.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        this.setScrollY(this.scrollY - dy * 0.5);
      },
    );

    // -------------------------------------------------------------------------
    // TOUCH / MOUSE
    // -------------------------------------------------------------------------

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < this.headerHeight) {
        return;
      }

      this.lastPointerY = pointer.y;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) {
        return;
      }

      if (pointer.y < this.headerHeight && this.lastPointerY < this.headerHeight) {
        return;
      }

      const dy = pointer.y - this.lastPointerY;

      this.lastPointerY = pointer.y;

      this.setScrollY(this.scrollY + dy);
    });
  }

  private setScrollY(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, this.minScroll, 0);

    this.contentContainer.y = this.scrollY;
  }

  // ===========================================================================
  // HEADER
  // ===========================================================================

  private createHeader(): void {
    const screenWidth = this.scale.width;

    // -------------------------------------------------------------------------
    // HEADER BACKGROUND
    // -------------------------------------------------------------------------

    this.add.rectangle(0, 0, screenWidth, this.headerHeight, 0x22223a).setOrigin(0).setDepth(5);

    // -------------------------------------------------------------------------
    // TITLE
    // -------------------------------------------------------------------------

    this.add
      .bitmapText(screenWidth / 2, 45, "russo", "ЛИДЕРБОРД", 56)
      .setOrigin(0.5)
      .setTint(0xffd700)
      .setDepth(6);

    // -------------------------------------------------------------------------
    // CLOSE
    // -------------------------------------------------------------------------

    new AlertButton(this.scene.scene, {
      textureKey: "ui",
      frameKey: "close_btn",
      x: screenWidth - 80,
      y: 60,
      scale: 0.8,
      onClick: () => this.close(),
      depth: 6,
    });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return [...entries].sort((a, b) => a.rank - b.rank);
  }

  // ===========================================================================
  // CLOSE
  // ===========================================================================

  private close(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);

    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
      this.scene.resume("GameScene");
      this.scene.resume("UIScene");
    });
  }
}
