// ui/ContractPanel.ts
import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { ContractTask, ContractUpdateData } from "../types/Contract";
import { ItemRegistry } from "../core/ItemRegistry";
import { ContractService } from "../core/ContractService";

export class ContractPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contractService: ContractService;

  private titleText!: Phaser.GameObjects.Text;
  private taskCards: Phaser.GameObjects.Container[] = [];
  private bgGraphics!: Phaser.GameObjects.Graphics;

  private readonly CARD_WIDTH = 120;
  private readonly CARD_HEIGHT = 140;
  private readonly CARD_GAP = 15;
  private readonly PANEL_X = 80;
  private readonly PANEL_Y = 150;

  constructor(scene: Phaser.Scene, contractService: ContractService) {
    this.scene = scene;
    this.contractService = contractService;
    this.container = scene.add.container(this.PANEL_X, this.PANEL_Y).setDepth(150);

    this.createVisuals();
    this.bindEvents();

    const existingContract = this.contractService.getActiveContract();
    if (existingContract) {
      this.renderContract({
        contract: existingContract,
        activeTargetLevel: this.contractService.getActiveTargetLevel(),
      });
    } else {
      this.container.setVisible(false);
    }
  }

  private createVisuals(): void {
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

    this.renderTasks(contract.tasks);
    this.drawBackground(contract.tasks.length);

    this.container.setScale(0);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
    });
  }

  // 🎯 НОВЫЙ МЕТОД: Полностью перерисовывает все карточки
  private renderTasks(tasks: ContractTask[]): void {
    // Уничтожаем старые карточки
    this.taskCards.forEach((card) => card.destroy());
    this.taskCards = [];

    // Создаём новые
    tasks.forEach((task, index) => {
      const card = this.createTaskCard(task, index);
      this.container.add(card);
      this.taskCards.push(card);
    });
  }

  private createTaskCard(task: ContractTask, index: number): Phaser.GameObjects.Container {
    const card = this.scene.add.container(0, index * (this.CARD_HEIGHT + this.CARD_GAP));
    const cardX = 0;
    const cardY = 0;

    // 1. Фон карточки
    const cardBg = this.scene.add.graphics();
    const bgColor = task.isLocked ? 0x7f8c8d : 0x4a90e2;
    cardBg.fillStyle(bgColor, 1);
    cardBg.fillRoundedRect(
      cardX - this.CARD_WIDTH / 2,
      cardY - this.CARD_HEIGHT / 2,
      this.CARD_WIDTH,
      this.CARD_HEIGHT,
      12,
    );

    const borderColor = 0xffffff;
    cardBg.lineStyle(4, borderColor, task.isLocked ? 0.5 : 1);
    cardBg.strokeRoundedRect(
      cardX - this.CARD_WIDTH / 2,
      cardY - this.CARD_HEIGHT / 2,
      this.CARD_WIDTH,
      this.CARD_HEIGHT,
      12,
    );
    card.add(cardBg);

    // 2. Спрайт айтема
    const frameName = ItemRegistry.getFrameName(task.targetLevel);
    const itemSprite = this.scene.add.image(cardX, cardY - 20, "squishes", frameName);
    const maxDim = Math.max(itemSprite.width, itemSprite.height);
    const scale = (70 / maxDim) * 0.9;

    itemSprite.setAlpha(task.isLocked ? 0.4 : 1);
    itemSprite.setScale(scale);
    card.add(itemSprite);

    // 3. Иконка замка для заблокированных задач
    if (task.isLocked) {
      const lockIcon = this.scene.add
        .text(cardX, cardY - 20, "🔒", {
          fontSize: "40px",
        })
        .setOrigin(0.5)
        .setDepth(10);
      card.add(lockIcon);
    }

    // 4. Текст прогресса
    const progressText = this.createProgressText(task);
    card.add(progressText);

    return card;
  }

  private createProgressText(task: ContractTask): Phaser.GameObjects.Text {
    let text = "";
    let color = "#ffffff";

    if (task.isLocked) {
      text = "🔒 ЗАБЛОКИРОВАНО";
      color = "#bdc3c7";
    } else if (task.isCompleted) {
      text = "✅ ГОТОВО";
      color = "#4caf50";
    } else {
      text = `${task.currentCount} / ${task.requiredCount}`;
      color = "#ffffff";
    }

    return this.scene.add
      .text(0, 45, text, {
        fontSize: "16px",
        color: color,
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
  }

  // 🎯 ИСПРАВЛЕНО: Теперь просто перерисовываем все карточки
  private updateProgress(data: ContractUpdateData): void {
    const contract = data.contract;

    // Полностью перерисовываем карточки (это надёжнее, чем пытаться обновлять частично)
    this.renderTasks(contract.tasks);
    this.drawBackground(contract.tasks.length);

    // Анимация для выполненных задач
    contract.tasks.forEach((task, index) => {
      if (task.isCompleted && this.taskCards[index]) {
        this.scene.tweens.add({
          targets: this.taskCards[index],
          scale: { from: 1.0, to: 1.1 },
          duration: 150,
          yoyo: true,
          ease: "Power2",
        });
      }
    });
  }

  private onContractCompleted(data: ContractUpdateData): void {
    this.scene.tweens.add({
      targets: this.container,
      scale: { from: 1.0, to: 1.15 },
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: "Power2",
    });
  }

  private drawBackground(taskCount: number): void {
    this.bgGraphics.clear();

    const totalHeight = taskCount * (this.CARD_HEIGHT + this.CARD_GAP) - this.CARD_GAP;
    const panelWidth = this.CARD_WIDTH + 40;
    const panelHeight = totalHeight + 120;

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
