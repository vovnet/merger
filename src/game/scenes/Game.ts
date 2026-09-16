import * as Phaser from "phaser";
import { Grid } from "../core/Grid";
import { GridRenderer } from "../core/GridRenderer";
import { Economy } from "../core/Economy";

export class Game extends Phaser.Scene {
  private grid!: Grid;
  private gridRenderer!: GridRenderer;
  private economy!: Economy;

  private currentLevel: number = 1;

  // 🎯 Добавляем ссылки на текстовые элементы, чтобы обновлять их динамически
  private spawnButtonText!: Phaser.GameObjects.Text;
  private levelDisplayText!: Phaser.GameObjects.Text;

  private coinsText!: Phaser.GameObjects.Text;

  private spawnClickCount: number = 0;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    this.load.atlas("squishes", "assets/spritesheet.png", "assets/spritesheet.json");
  }

  create(): void {
    // 1. Создаём логику поля 6×5
    this.grid = new Grid({ cols: 6, rows: 5 });

    // 2. Создаём рендерер
    this.gridRenderer = new GridRenderer(this, this.grid);

    this.economy = new Economy(this.registry);
    this.registry.set("economy", this.economy);

    // 3. Создаём UI
    this.createUI();

    // 4. Слушаем события
    this.setupEventListeners();
  }

  private createUI(): void {
    // Кнопка спауна
    const buttonBg = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height - 80,
      200,
      60,
      0x4a90e2,
    );
    buttonBg.setStrokeStyle(2, 0xffffff);
    buttonBg.setInteractive({ useHandCursor: true });

    // 🎯 Сохраняем ссылку на текст кнопки и сразу ставим актуальный уровень спауна
    this.spawnButtonText = this.add
      .text(this.scale.width / 2, this.scale.height - 80, `СПАУН (Ур. ${this.getSpawnLevel()})`, {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    buttonBg.on("pointerdown", () => this.spawnRandomItem());
    buttonBg.on("pointerover", () => buttonBg.setFillStyle(0x5aa0f2));
    buttonBg.on("pointerout", () => buttonBg.setFillStyle(0x4a90e2));

    // Текст максимального уровня сверху
    this.levelDisplayText = this.add
      .text(this.scale.width / 2, 60, `🏆 Макс. уровень: ${this.currentLevel}`, {
        fontSize: "24px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // 💰 НОВОЕ: Отображение монет
    this.coinsText = this.add
      .text(20, 20, `💰 ${this.economy.currentCoins}`, {
        fontSize: "24px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0, 0);

    // ==========================================
    // 🎯 КНОПКА: Заполнить всё поле
    // ==========================================
    const fillButtonX = this.scale.width - 100;
    const fillButtonY = this.scale.height - 160; // Чуть выше кнопки спауна

    const fillButtonBg = this.add.rectangle(
      fillButtonX,
      fillButtonY,
      140,
      50,
      0x9b59b6, // Фиолетовый цвет, чтобы отличалась
    );
    fillButtonBg.setStrokeStyle(2, 0xffffff);
    fillButtonBg.setInteractive({ useHandCursor: true });

    const fillButtonText = this.add
      .text(fillButtonX, fillButtonY, "ЗАПОЛНИТЬ", {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    fillButtonBg.on("pointerdown", () => this.fillAllEmptyCells());
    fillButtonBg.on("pointerover", () => fillButtonBg.setFillStyle(0xa96ac6));
    fillButtonBg.on("pointerout", () => fillButtonBg.setFillStyle(0x9b59b6));

    this.updateEmptyCellsCounter();

    // ==========================================
    // 🛠️ ТЕСТОВАЯ КНОПКА: +500 монет
    // ==========================================
    const testBtnX = this.scale.width - 100; // Правый верхний угол
    const testBtnY = 100;

    const testButtonBg = this.add.rectangle(
      testBtnX,
      testBtnY,
      140,
      50,
      0x2ecc71, // Зелёный цвет, чтобы отличалась
    );
    testButtonBg.setStrokeStyle(2, 0xffffff);
    testButtonBg.setInteractive({ useHandCursor: true });

    const testButtonText = this.add
      .text(testBtnX, testBtnY, "+500 💰 (Тест)", {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Логика кнопки
    testButtonBg.on("pointerdown", () => {
      this.economy.addCoins(500);
      console.log("🛠️ [DEV] Добавлено 500 тестовых монет. Баланс:", this.economy.currentCoins);

      // Небольшая анимация нажатия для фидбека
      this.tweens.add({
        targets: testButtonBg,
        scale: { from: 1.1, to: 1 },
        duration: 150,
        ease: "Power2",
      });
    });

    testButtonBg.on("pointerover", () => testButtonBg.setFillStyle(0x27ae60));
    testButtonBg.on("pointerout", () => testButtonBg.setFillStyle(0x2ecc71));

    this.undoButton();
  }

  private fillAllEmptyCells(): void {
    const levelToSpawn = this.getSpawnLevel();
    const emptyCount = this.grid.getEmptyCells().length;

    // 1. Проверка: есть ли пустые клетки
    if (emptyCount === 0) {
      this.showGridFullMessage();
      return;
    }

    // 5. Заполняем сетку
    const filledCount = this.grid.fillEmptyCells(levelToSpawn);

    if (filledCount > 0) {
      this.spawnClickCount += filledCount;
      console.log(`✨ Заполнено ${filledCount} ячеек предметами ур.${levelToSpawn}`);
    }
  }

  private setupEventListeners(): void {
    this.grid.on("itemAdded", () => this.updateEmptyCellsCounter());
    this.grid.on("itemRemoved", () => this.updateEmptyCellsCounter());
    this.grid.on("gridFull", () => this.showGridFullMessage());

    this.grid.on("newLevelUnlocked", (data: { level: number }) => {
      this.onNewLevelUnlocked(data.level);
    });

    // 🎯 Награда за слияние (теперь в монетах)
    this.grid.on("itemMerged", (data: { newLevel: number; from: any; to: any }) => {
      const reward = this.economy.getMergeReward(data.newLevel);
      this.economy.addCoins(reward);
      console.log(`💰 Слияние в ур.${data.newLevel} → +${reward} монет`);
    });

    // 🎯 Слушаем встроенные события registry
    this.registry.events.on(
      "changedata-coins",
      (parent: any, value: number, previousValue: number) => {
        this.coinsText.setText(`💰 ${value}`);

        const delta = value - previousValue;
        if (delta !== 0) {
          this.tweens.add({
            targets: this.coinsText,
            scale: { from: 1.3, to: 1 },
            duration: 300,
            ease: "Back.easeOut",
          });
        }
      },
    );
  }

  private undoButton() {
    const undoButtonX = 100; // Слева
    const undoButtonY = this.scale.height - 160;

    const undoButtonBg = this.add.rectangle(
      undoButtonX,
      undoButtonY,
      140,
      50,
      0xe67e22, // Оранжевый цвет
    );
    undoButtonBg.setStrokeStyle(2, 0xffffff);
    undoButtonBg.setInteractive({ useHandCursor: true });

    const undoButtonText = this.add
      .text(undoButtonX, undoButtonY, "ОТМЕНА", {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Логика кнопки
    undoButtonBg.on("pointerdown", () => {
      this.grid.undo();
    });
    undoButtonBg.on("pointerover", () => undoButtonBg.setFillStyle(0xd35400));
    undoButtonBg.on("pointerout", () => undoButtonBg.setFillStyle(0xe67e22));
  }

  // 🎯 НОВАЯ МЕТОДИКА: Вычисление уровня для кнопки спауна
  private getSpawnLevel(): number {
    // Если currentLevel <= 4, вернёт 1. Если 5, вернёт 2. Если 6, вернёт 3 и т.д.
    return Math.max(1, this.currentLevel - 6);
  }

  private onNewLevelUnlocked(level: number): void {
    this.currentLevel = level;

    console.log(`🖱️ Нажатий кнопки спауна: ${this.spawnClickCount}`);
    this.spawnClickCount = 0;

    // 🎯 НОВОЕ: Очищаем поле от мёртвых предметов
    const spawnLevel = this.getSpawnLevel();
    const removedItems = this.grid.removeItemsBelowLevel(spawnLevel);

    // 💰 Компенсация: даём монеты за каждый удалённый предмет
    if (removedItems.length > 0) {
      const compensation = removedItems.reduce((sum, item) => sum + item.level * 5, 0);
      this.economy.addCoins(compensation);
      this.showCleanupMessage(removedItems.length, compensation);
    }

    // Обновляем UI
    this.levelDisplayText.setText(`🏆 Макс. уровень: ${this.currentLevel}`);
    const newCost = this.economy.getSpawnCost(spawnLevel);
    this.spawnButtonText.setText(`СПАУН Ур.${spawnLevel} (${newCost}💰)`);

    // Показываем уведомление об уровне
    this.showLevelUpMessage(level);
    this.grid.clearHistory();

    console.log(`🎉 НОВЫЙ УРОВЕНЬ: ${level}! Удалено предметов: ${removedItems.length}`);
  }

  // 💬 НОВЫЙ МЕТОД: Уведомление об очистке поля
  private showCleanupMessage(count: number, compensation: number): void {
    const message = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 100,
        `🧹 Удалено предметов: ${count}\n💰 Компенсация: +${compensation}`,
        {
          fontSize: "20px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          backgroundColor: "#000000aa",
          padding: { x: 15, y: 10 },
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(300);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: message.y - 50,
      duration: 2000,
      delay: 500,
      onComplete: () => message.destroy(),
    });
  }

  private showLevelUpMessage(level: number): void {
    // Затемняющий фон
    const overlay = this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        0x000000,
        0.5,
      )
      .setDepth(200);

    // Основной текст
    const title = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 40, "🎉 НОВЫЙ УРОВЕНЬ!", {
        fontSize: "42px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(201)
      .setScale(0);

    const levelText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 20, `Уровень ${level} открыт!`, {
        fontSize: "28px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(201)
      .setAlpha(0);

    // Анимация появления
    this.tweens.add({
      targets: title,
      scale: { from: 0, to: 1.2 },
      duration: 300,
      ease: "Back.easeOut",
      yoyo: true,
      hold: 50,
      onComplete: () => title.setScale(1),
    });

    this.tweens.add({
      targets: levelText,
      alpha: 1,
      y: this.scale.height / 2 + 30,
      duration: 400,
      delay: 200,
      ease: "Power2",
    });

    // Исчезновение через 2 секунды
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [overlay, title, levelText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          title.destroy();
          levelText.destroy();
        },
      });
    });
  }

  // 🎯 ГЛАВНЫЙ МЕТОД: Спаун случайного предмета с учётом задержки
  private spawnRandomItem(): void {
    const levelToSpawn = this.getSpawnLevel();
    const cost = this.economy.getSpawnCost(levelToSpawn);

    // 🎯 ПРОВЕРКА 1: Есть ли свободные клетки?
    if (!this.grid.hasEmptyCell()) {
      return;
    }

    if (!this.economy.canAfford(cost)) {
      console.log("no money!");
      return;
    }

    this.economy.spendCoins(cost);
    const item = this.grid.spawnRandomItem(levelToSpawn);

    if (item) {
      // 🎯 Увеличиваем счётчик при успешном спауне
      this.spawnClickCount++;
      console.log(`✨ Создан предмет ур.${item.level} (кнопка даёт ур. ${levelToSpawn})`);
      console.log(`📊 Пустых клеток: ${this.grid.getEmptyCells().length}`);
    }
  }

  private updateEmptyCellsCounter(): void {
    const emptyCount = this.grid.getEmptyCells().length;
    console.log(`📦 Свободно клеток: ${emptyCount} / ${this.grid.totalCells}`);
  }

  private showGridFullMessage(): void {
    const text = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "⚠️ ПОЛЕ ЗАПОЛНЕНО!", {
        fontSize: "32px",
        color: "#ff4757",
        fontFamily: "Arial",
        fontStyle: "bold",
        backgroundColor: "#000000",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 50,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }
}
