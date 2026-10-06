import * as Phaser from "phaser";
import { t } from "../../locales";
import { TranslationKey } from "../../locales/ru";
import { GameState } from "../core/GameState";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { AchievementManager } from "../core/achivements/AchivementsManager";

export class AchievementsScene extends Phaser.Scene {
  private gameState!: GameState;
  private cardsContainer!: Phaser.GameObjects.Container;
  private achievementManager: AchievementManager;

  constructor() {
    super({ key: "AchievementsScene" });
  }

  create() {
    // 1. Ставим игру на паузу, пока игрок смотрит достижения
    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    this.achievementManager = this.registry.get("achievementManager") as AchievementManager;

    this.gameState = this.registry.get("gameState") as GameState;

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // 2. 🎯 НЕПРОЗРАЧНЫЙ ФОН (alpha = 1)
    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x151520, 1).setOrigin(0).setDepth(100);

    // 3. Заголовок
    this.add
      .bitmapText(
        screenWidth / 2,
        60,
        "russo",
        t("ACHIEVEMENTS_TITLE" as TranslationKey) || "ДОСТИЖЕНИЯ",
        42,
      )
      .setOrigin(0.5)
      .setTint(0xffd700)
      .setDepth(102);

    // 4. Кнопка закрытия
    this.add
      .sprite(screenWidth - 60, 60, "ui", "close_btn")
      .setScale(0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(102)
      .on("pointerdown", () => this.closeScene());

    // 5. Контейнер для сетки карточек (центрируем по экрану)
    this.cardsContainer = this.add.container(screenWidth / 2, screenHeight / 2 + 20).setDepth(101);

    // 6. Рендерим сетку
    this.renderGrid();

    // 7. 🎯 Слушаем событие получения награды для мгновенного обновления UI без перезагрузки сцены
    EventBus.on(GameEvents.ACHIEVEMENT_CLAIMED, this.renderGrid, this);
  }

  // 🎯 Отрисовка сетки 2x3
  private renderGrid(): void {
    // Очищаем старые карточки перед перерисовкой
    this.cardsContainer.removeAll(true);

    const achievements = this.achievementManager.getAchievementsForUI();

    const cols = 2;
    const rows = 3;
    const cardW = 300;
    const cardH = 160;
    const gapX = 40;
    const gapY = 30;

    // Вычисляем стартовые координаты для идеального центрирования внутри контейнера
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

    // 1. Фон карточки
    const borderColor = ach.canClaim ? 0x00ff00 : 0xffd700;
    const bg = this.add
      .rectangle(0, 0, w, h, 0x1e1e2e)
      .setStrokeStyle(3, borderColor)
      .setOrigin(0.5);

    card.add(bg);

    // Анимация пульсации для доступной награды
    if (ach.canClaim) {
      this.tweens.add({
        targets: bg,
        strokeColor: 0x55ff55,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }

    // 2. Иконка
    const icon = this.add
      .sprite(-110, 0, "achievements", ach.icon)
      .setScale(0.7)
      .setTint(ach.isMaxedOut ? 0xffd700 : 0xffffff);
    card.add(icon);

    // 3. Заголовок
    const titleText = this.add
      .bitmapText(-50, -45, "russo", t(ach.titleKey as TranslationKey), 20)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    card.add(titleText);

    // 4. Описание
    const descText = this.add
      .text(-50, -15, ach.description, {
        fontSize: "16px",
        color: "#a8e6ff",
        wordWrap: { width: 180 },
      })
      .setOrigin(0, 0.5);
    card.add(descText);

    // 5. Прогресс-бар
    const progressPct = Math.min(1, ach.progress.currentValue / ach.currentTier.targetValue);
    const barBg = this.add.rectangle(-50, 25, 180, 12, 0x000000).setOrigin(0, 0.5);
    const barFill = this.add
      .rectangle(-50, 25, 180 * progressPct, 12, ach.canClaim ? 0x00ff00 : 0xffd700)
      .setOrigin(0, 0.5);
    card.add([barBg, barFill]);

    // Текст прогресса
    const progressLabel = this.add
      .text(-50, 42, `${ach.progress.currentValue} / ${ach.currentTier.targetValue}`, {
        fontSize: "14px",
        color: "#888888",
      })
      .setOrigin(0, 0.5);
    card.add(progressLabel);

    // 6. Правая часть: Кнопка действия или статус
    if (ach.isMaxedOut) {
      const maxedText = this.add
        .bitmapText(60, 0, "russo", t("ACH_MAXED_OUT" as TranslationKey), 22)
        .setOrigin(0.5)
        .setTint(0xffd700);
      card.add(maxedText);
    } else if (ach.canClaim) {
      const rewardStr = this.formatReward(ach.currentTier.rewardCoins, ach.currentTier.rewardSpins);

      // 🎯 Кнопка "Забрать" (используем прямоугольник для гарантированной отрисовки, если нет спрайта)
      const claimBtn = this.add
        .rectangle(80, 0, 130, 40, 0x00cc00)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const claimText = this.add
        .bitmapText(80, 2, "russo", "ЗАБРАТЬ", 18)
        .setOrigin(0.5)
        .setTint(0xffffff);

      const rewardLabel = this.add
        .text(80, 22, rewardStr, { fontSize: "14px", color: "#ffffff" })
        .setOrigin(0.5);

      // Hover эффекты
      claimBtn.on("pointerover", () => claimBtn.setFillStyle(0x00ff00));
      claimBtn.on("pointerout", () => claimBtn.setFillStyle(0x00cc00));

      // 🎯 Клик по кнопке "Забрать"
      claimBtn.on("pointerdown", () => {
        claimBtn.disableInteractive();
        this.achievementManager.claimReward(ach.id);
        // renderGrid вызовется автоматически через EventBus.ACHIEVEMENT_CLAIMED
      });

      card.add([claimBtn, claimText, rewardLabel]);
    } else {
      // Заблокировано / в процессе
      const nextRewardStr = this.formatReward(
        ach.currentTier.rewardCoins,
        ach.currentTier.rewardSpins,
      );
      const lockedText = this.add
        .text(80, 0, `Награда:\n${nextRewardStr}`, {
          fontSize: "15px",
          color: "#666666",
          align: "center",
        })
        .setOrigin(0.5);
      card.add(lockedText);
    }

    this.cardsContainer.add(card);
  }

  // 🎯 Хелпер для красивого форматирования награды
  private formatReward(coins: number, spins: number): string {
    const parts = [];
    if (coins > 0) parts.push(`${coins} 💰`);
    if (spins > 0) parts.push(`${spins} 🎟️`);
    return parts.join(" + ");
  }

  // 🎯 Закрытие сцены
  private closeScene(): void {
    // Снимаем с паузы основные сцены
    this.scene.resume("GameScene");
    this.scene.resume("UIScene");

    // Плавное затемнение перед закрытием (цвет совпадает с фоном 0x151520)
    this.cameras.main.fadeOut(200, 21, 21, 32);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop();
    });
  }

  // 🎯 Очистка памяти при уничтожении сцены
  shutdown(): void {
    // Обязательно отписываемся от EventBus, чтобы не было дублирования при повторном открытии!
    EventBus.off(GameEvents.ACHIEVEMENT_CLAIMED, this.renderGrid, this);
    this.cardsContainer?.removeAll(true);
  }
}
