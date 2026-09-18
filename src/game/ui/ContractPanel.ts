import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { ContractTask, ContractUpdateData } from "../types/Contract";
import { ItemRegistry } from "../core/ItemRegistry";

export class ContractPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  private titleText!: Phaser.GameObjects.Text;
  private taskCards: Phaser.GameObjects.Container[] = [];
  private bgGraphics!: Phaser.GameObjects.Graphics;

  private readonly CARD_WIDTH = 120;
  private readonly CARD_HEIGHT = 140;
  private readonly CARD_GAP = 15;
  private readonly PANEL_X = 80; // Отступ слева
  private readonly PANEL_Y = 150; // Отступ сверху

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(this.PANEL_X, this.PANEL_Y).setDepth(150);

    this.createVisuals();
    this.bindEvents();

    this.container.setVisible(false);
  }

  private createVisuals(): void {
    // Заголовок
    this.titleText = this.scene.add
      .text(0, -80, " КОНТРАКТ", {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.container.add(this.titleText);

    // Фон панели (будет перерисован под размер контента)
    this.bgGraphics = this.scene.add.graphics();
    this.container.add(this.bgGraphics);
  }

  private bindEvents(): void {
    EventBus.on(GameEvents.CONTRACT_CREATED, this.renderContract, this);
    EventBus.on(GameEvents.CONTRACT_UPDATED, this.updateProgress, this);
    EventBus.on(GameEvents.CONTRACT_COMPLETED, this.onContractCompleted, this);
  }

  private renderContract(data: ContractUpdateData): void {
    const contract = data.contract;
    this.container.setVisible(true);

    // Очищаем старые карточки
    this.taskCards.forEach((card) => card.destroy());
    this.taskCards = [];

    // Создаем новые карточки
    contract.tasks.forEach((task, index) => {
      const card = this.createTaskCard(task, index);
      this.container.add(card);
      this.taskCards.push(card);
    });

    // Перерисовываем фон под новый размер
    this.drawBackground(contract.tasks.length);

    // Анимация появления
    this.container.setScale(0);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
    });
  }

  private createTaskCard(task: ContractTask, index: number): Phaser.GameObjects.Container {
    const card = this.scene.add.container(0, index * (this.CARD_HEIGHT + this.CARD_GAP));

    const cardX = 0;
    const cardY = 0;

    // 1. Фон карточки (белая обводка + цветной фон)
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x4a90e2, 1); // Синий фон
    cardBg.fillRoundedRect(
      cardX - this.CARD_WIDTH / 2,
      cardY - this.CARD_HEIGHT / 2,
      this.CARD_WIDTH,
      this.CARD_HEIGHT,
      12,
    );
    cardBg.lineStyle(4, 0xffffff, 1); // Белая обводка
    cardBg.strokeRoundedRect(
      cardX - this.CARD_WIDTH / 2,
      cardY - this.CARD_HEIGHT / 2,
      this.CARD_WIDTH,
      this.CARD_HEIGHT,
      12,
    );
    card.add(cardBg);

    // 2. Спрайт айтема (используем ItemRegistry для получения frameName)
    const frameName = ItemRegistry.getFrameName(task.targetLevel);
    const itemSprite = this.scene.add.image(cardX, cardY - 20, "squishes", frameName);

    // Масштабируем спрайт
    const maxDim = Math.max(itemSprite.width, itemSprite.height);
    const scale = (70 / maxDim) * 0.9;
    itemSprite.setScale(scale);
    card.add(itemSprite);

    // 3. Текст прогресса
    const progressText = this.createProgressText(task);
    card.add(progressText);

    return card;
  }

  private createProgressText(task: ContractTask): Phaser.GameObjects.Text {
    const text = task.isCompleted ? "✅ ГОТОВО" : `${task.currentCount}/${task.requiredCount}`;
    const color = task.isCompleted ? "#4caf50" : "#ffffff";

    return this.scene.add
      .text(0, 45, text, {
        fontSize: "18px",
        color: color,
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
  }

  private updateProgress(data: ContractUpdateData): void {
    const contract = data.contract;

    // Обновляем каждую карточку
    contract.tasks.forEach((task, index) => {
      if (this.taskCards[index]) {
        const card = this.taskCards[index];

        // Находим текст прогресса (последний ребенок карточки)
        const progressText = card.list[card.list.length - 1] as Phaser.GameObjects.Text;

        if (progressText && progressText instanceof Phaser.GameObjects.Text) {
          const newText = task.isCompleted
            ? "✅ ГОТОВО"
            : `${task.currentCount}/${task.requiredCount}`;
          const newColor = task.isCompleted ? "#4caf50" : "#ffffff";

          progressText.setText(newText);
          progressText.setColor(newColor);

          // Анимация при выполнении задачи
          if (task.isCompleted) {
            this.scene.tweens.add({
              targets: card,
              scale: { from: 1.0, to: 1.1 },
              duration: 150,
              yoyo: true,
              ease: "Power2",
            });
          }
        }
      }
    });
  }

  private onContractCompleted(data: ContractUpdateData): void {
    // Эффект выполнения контракта
    this.scene.tweens.add({
      targets: this.container,
      scale: { from: 1.0, to: 1.15 },
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: "Power2",
    });

    // Можно добавить конфетти или другие эффекты здесь
  }

  private drawBackground(taskCount: number): void {
    this.bgGraphics.clear();

    const totalHeight = taskCount * (this.CARD_HEIGHT + this.CARD_GAP) - this.CARD_GAP;
    const panelWidth = this.CARD_WIDTH + 40;
    const panelHeight = totalHeight + 120; // +120 для заголовка и отступов

    this.bgGraphics.fillStyle(0x2a2a3e, 0.85);
    this.bgGraphics.fillRoundedRect(-panelWidth / 2, -100, panelWidth, panelHeight, 20);
    this.bgGraphics.lineStyle(4, 0xffffff, 1);
    this.bgGraphics.strokeRoundedRect(-panelWidth / 2, -100, panelWidth, panelHeight, 20);
  }

  public destroy(): void {
    EventBus.off(GameEvents.CONTRACT_CREATED, this.renderContract, this);
    EventBus.off(GameEvents.CONTRACT_UPDATED, this.updateProgress, this);
    EventBus.off(GameEvents.CONTRACT_COMPLETED, this.onContractCompleted, this);
    this.container.destroy();
  }
}
