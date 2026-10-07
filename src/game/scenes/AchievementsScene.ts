import * as Phaser from "phaser";
import { t } from "../../locales";
import { TranslationKey } from "../../locales/ru";
import { GameState } from "../core/GameState";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { AchievementManager } from "../core/achivements/AchivementsManager";

export class AchievementsScene extends Phaser.Scene {
  private gameState: GameState;
  private cardsContainer!: Phaser.GameObjects.Container;
  private achievementManager: AchievementManager;

  // 🎯 НОВОЕ: Контейнер для общего прогресс-бара
  private globalProgressContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "AchievementsScene" });
  }

  create() {
    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    this.achievementManager = this.registry.get("achievementManager") as AchievementManager;
    this.gameState = this.registry.get("gameState") as GameState;

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // 1. 🎯 НЕПРОЗРАЧНЫЙ ФОН (alpha = 1)
    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x151520, 1).setOrigin(0).setDepth(100);

    // 2. Заголовок
    this.add
      .bitmapText(screenWidth / 2, 30, "russo", t("ACHIEVEMENTS_TITLE"), 42)
      .setOrigin(0.5)
      .setTint(0xffd700)
      .setDepth(102);

    // 3. 🎯 Контейнер для общего прогресс-бара (под заголовком)
    this.globalProgressContainer = this.add.container(screenWidth / 2, 90).setDepth(102);

    // 4. Кнопка закрытия
    this.add
      .sprite(screenWidth - 60, 60, "ui", "close_btn")
      .setScale(0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(102)
      .on("pointerdown", () => this.closeScene());

    // 5. Контейнер для сетки карточек
    this.cardsContainer = this.add.container(screenWidth / 2, screenHeight / 2 + 50).setDepth(101);

    // 6. Рендерим общий прогресс и сетку
    this.renderGlobalProgress();
    this.renderGrid();

    // 7. 🎯 Слушаем событие получения награды для мгновенного обновления UI
    EventBus.on(GameEvents.ACHIEVEMENT_CLAIMED, this.onAchievementClaimed, this);
  }

  // 🎯 Отдельный метод для обновления при получении награды (чтобы не перерисовывать всю сетку зря)
  private onAchievementClaimed(): void {
    this.renderGlobalProgress();
    this.renderGrid();
  }

  // 🎯 Отрисовка общего прогресс-бара
  private renderGlobalProgress(): void {
    this.globalProgressContainer.removeAll(true);

    const achievements = this.achievementManager.getAchievementsForUI();

    // 🎯 Считаем общее количество шагов и пройденных шагов
    let totalTiers = 0;
    let completedTiers = 0;

    achievements.forEach((ach) => {
      totalTiers += ach.tiers.length;
      // currentTierIndex равен количеству ПОЛНОСТЬЮ пройденных и забранных шагов
      completedTiers += ach.progress.currentTierIndex;
    });

    const screenWidth = this.scale.width;
    const barWidth = Math.min(600, screenWidth - 80); // Адаптивная ширина, макс 600px
    const barHeight = 16;

    // 1. Текст прогресса (например, "15 / 60")
    const progressText = this.add
      .bitmapText(
        0,
        -24,
        "russo",
        t("ACH_PROGRESS", { current: completedTiers, total: totalTiers }),
        18,
      )
      .setOrigin(0.5)
      .setTint(0xffffff);

    // 2. Фон прогресс-бара
    const barBg = this.add
      .rectangle(0, 0, barWidth, barHeight, 0x000000)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x333333);

    // 3. Заполнение прогресс-бара
    const progressPct = totalTiers > 0 ? completedTiers / totalTiers : 0;
    const fillWidth = barWidth * progressPct;

    const barFill = this.add
      .rectangle(-barWidth / 2, 0, fillWidth, barHeight, 0xffd700)
      .setOrigin(0, 0.5); // Растет слева направо

    // 🎯 Анимация плавного заполнения при открытии/обновлении
    barFill.width = 0;
    this.tweens.add({
      targets: barFill,
      width: fillWidth,
      duration: 600,
      ease: "Power2.out",
    });

    this.globalProgressContainer.add([progressText, barBg, barFill]);
  }

  // 🎯 Отрисовка сетки 2x3
  private renderGrid(): void {
    this.cardsContainer.removeAll(true);

    const achievements = this.achievementManager.getAchievementsForUI();

    const cols = 2;
    const rows = 3;
    const cardW = 400;
    const cardH = 180;
    const gapX = 40;
    const gapY = 20;

    const totalW = cols * cardW + (cols - 1) * gapX;
    const totalH = rows * cardH + (rows - 1) * gapY;
    const startX = -totalW / 2 + cardW / 2;
    const startY = -totalH / 2 + cardH / 2;

    achievements.forEach((ach, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      this.createCard(x, y, cardW, cardH, ach);
    });
  }

  // 🎯 Создание одной карточки достижения
  private createCard(x: number, y: number, w: number, h: number, ach: any): void {
    const card = this.add.container(x, y);

    this.renderBaseCard(ach, card, w, h);

    // 5. Прогресс-бар карточки
    if (!ach.isMaxedOut && !ach.canClaim) {
      this.renderCardProgressBar(ach, card);
    }

    if (!ach.isMaxedOut) {
      this.renderReward(ach, card);
    }

    if (ach.isMaxedOut) {
      const maxedText = this.add
        .bitmapText(80, 30, "russo", t("ACH_MAXED_OUT"), 18)
        .setOrigin(0.5)
        .setTint(0xffd700);
      card.add(maxedText);
    }

    if (ach.canClaim) {
      this.renderClaimButton(ach, card);
    } else {
      if (!ach.isMaxedOut) {
        this.renderTierProgress(ach, card);
      }
    }

    this.cardsContainer.add(card);
  }

  private renderBaseCard(ach: any, card: Phaser.GameObjects.Container, w: number, h: number) {
    // 1. Фон карточки
    const borderColor = ach.isMaxedOut ? 0xffd700 : ach.canClaim ? 0xb700ff : 0x88e7ff;
    const bg = this.add
      .rectangle(0, 0, w, h, ach.canClaim ? 0x402a44 : 0x2f2f47)
      .setStrokeStyle(3, borderColor)
      .setOrigin(0.5);
    card.add(bg);

    // 2. Иконка достижения
    const icon = this.add
      .sprite(-120, -20, "achievements", ach.icon)
      .setScale(0.7)
      .setTint(ach.isMaxedOut ? 0xffd700 : 0xffffff);
    card.add(icon);

    if (ach.canClaim) {
      this.tweens.add({
        targets: icon,
        scale: { from: 0.7, to: 0.8 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // 3. Заголовок
    const titleText = this.add
      .bitmapText(-50, -60, "russo", t(ach.titleKey as TranslationKey), 20)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    card.add(titleText);

    // 4. Описание
    const descText = this.add
      .bitmapText(-50, -15, "russo", ach.description, 12)
      .setOrigin(0, 0.5)
      .setTint(0x3796ce)
      .setMaxWidth(100);
    card.add(descText);
  }

  private renderReward(ach: any, card: Phaser.GameObjects.Container) {
    const rewardContainer = this.add.container(80, -10);
    const icon = this.add.sprite(0, 0, "ui", "coin").setOrigin(0.5).setScale(0.36).setAngle(-15);
    const text = this.add
      .bitmapText(20, -6, "russo", `+${ach.currentTier.rewardCoins}`, 20)
      .setOrigin(0, 0.5);

    rewardContainer.add([icon, text]);

    card.add(rewardContainer);
  }

  private renderClaimButton(ach: any, card: Phaser.GameObjects.Container) {
    const claimBtnY = 50;
    const claimBtn = this.add
      .sprite(0, claimBtnY, "shop", "buy_btn")
      .setOrigin(0.5)
      .setScale(0.5)
      .setInteractive({ useHandCursor: true });

    const claimText = this.add
      .bitmapText(0, claimBtnY - 2, "russo", t("ACH_CLAIM"), 14)
      .setOrigin(0.5)
      .setTint(0xffd700);

    // 🎯 Hover-эффекты
    claimBtn.on("pointerover", () => {
      claimBtn.setScale(0.55);
      claimText.setScale(1.1);
    });
    claimBtn.on("pointerout", () => {
      claimBtn.setScale(0.5);
      claimBtn.clearTint();
      claimText.setScale(1);
    });

    claimBtn.on("pointerdown", () => {
      claimBtn.disableInteractive();
      this.achievementManager.claimReward(ach.id);
    });

    card.add([claimBtn, claimText]);
  }

  private renderCardProgressBar(ach: any, card: Phaser.GameObjects.Container) {
    const progressBarWidth = 220;
    const progressPct = Math.min(1, ach.progress.currentValue / ach.currentTier.targetValue);
    const barBg = this.add.rectangle(-50, 25, progressBarWidth, 12, 0x000000).setOrigin(0, 0.5);
    const barFill = this.add
      .rectangle(-50, 25, progressBarWidth * progressPct, 12, 0xffd700)
      .setOrigin(0, 0.5);

    const progressLabel = this.add
      .bitmapText(
        -50,
        42,
        "russo",
        `${ach.progress.currentValue} / ${ach.currentTier.targetValue}`,
        10,
      )
      .setOrigin(0, 0.5)
      .setTint(0x888888);

    card.add([barBg, barFill, progressLabel]);
  }

  private renderTierProgress(ach: any, card: Phaser.GameObjects.Container) {
    const tiers = ach.tiers;
    const currentTierIndex = ach.progress.currentTierIndex;
    const totalTiers = tiers.length;

    const iconSize = 24;
    const gap = 6;
    const totalIconsWidth = totalTiers * iconSize + (totalTiers - 1) * gap;
    const startX = -totalIconsWidth / 2 + iconSize / 2;
    const yPos = 65;

    for (let i = 0; i < totalTiers; i++) {
      const isCompleted = i < currentTierIndex;
      const iconKey = isCompleted ? "progres_icon_active" : "progres_icon_disabled";

      const tierIcon = this.add
        .sprite(startX + i * (iconSize + gap), yPos, "achievements", iconKey)
        .setOrigin(0.5)
        .setScale(1);

      if (i === currentTierIndex && !ach.isMaxedOut) {
        this.tweens.add({
          targets: tierIcon,
          scale: { from: 1, to: 1.15 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      card.add(tierIcon);
    }
  }

  private closeScene(): void {
    this.scene.resume("GameScene");
    this.scene.resume("UIScene");

    this.cameras.main.fadeOut(200, 21, 21, 32);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop();
    });
  }

  shutdown(): void {
    EventBus.off(GameEvents.ACHIEVEMENT_CLAIMED, this.onAchievementClaimed, this);
    this.cardsContainer?.removeAll(true);
    this.globalProgressContainer?.removeAll(true);
  }
}
