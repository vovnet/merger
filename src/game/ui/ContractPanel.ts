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

  private taskCards: Phaser.GameObjects.Container[] = [];
  private bgGraphics!: Phaser.GameObjects.Graphics;

  // 🎯 НОВЫЕ ПОЛЯ для футера с прогрессом и наградой
  private footerContainer!: Phaser.GameObjects.Container;
  private overallProgressText!: Phaser.GameObjects.BitmapText;
  private rewardContainer!: Phaser.GameObjects.Container;
  private completedText!: Phaser.GameObjects.BitmapText;

  private readonly CARD_WIDTH = 120;
  private readonly CARD_HEIGHT = 140;
  private readonly CARD_GAP = 30;
  private readonly FOOTER_OFFSET = 50; // Отступ от последней карточки до футера
  private readonly PANEL_X = 80;
  private readonly PANEL_Y = 150;

  constructor(scene: Phaser.Scene, contractService: ContractService) {
    this.scene = scene;
    this.contractService = contractService;
    this.container = scene.add.container(this.PANEL_X, this.PANEL_Y).setDepth(150);

    this.createVisuals();
    this.createFooter(); // 🎯 Создаем футер один раз
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
    this.bgGraphics = this.scene.add.graphics();
    this.container.add(this.bgGraphics);
  }

  // 🎯 НОВЫЙ МЕТОД: Создание футера с прогрессом и наградой
  private createFooter(): void {
    this.footerContainer = this.scene.add.container(0, 0);

    // 1. Общий прогресс (например, "2/3")
    this.overallProgressText = this.scene.add
      .bitmapText(0, 0, "russo", "0/0", 26)
      .setOrigin(0.5)
      .setTint(0xffd700); // Золотой цвет для акцента
    this.footerContainer.add(this.overallProgressText);

    // 2. Контейнер награды: спрайт "ticket" + текст "+1"
    this.rewardContainer = this.scene.add.container(0, 35);

    const ticketSprite = this.scene.add.image(-20, 6, "ui", "ticket").setScale(0.6);
    ticketSprite.setOrigin(0.5);

    const rewardText = this.scene.add
      .bitmapText(5, 0, "russo", "+1", 24)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);

    this.rewardContainer.add([ticketSprite, rewardText]);
    this.footerContainer.add(this.rewardContainer);

    this.completedText = this.scene.add
      .bitmapText(0, 15, "russo", "ВЫПОЛНЕНО", 18)
      .setOrigin(0.5)
      .setTint(0x4caf50) // Зеленый цвет успеха
      .setVisible(false);
    this.footerContainer.add(this.completedText);

    this.container.add(this.footerContainer);
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
    this.updateFooter(contract.tasks); // 🎯 Обновляем футер
    this.drawBackground(contract.tasks.length);

    this.container.setScale(0);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
    });
  }

  private renderTasks(tasks: ContractTask[]): void {
    this.taskCards.forEach((card) => card.destroy());
    this.taskCards = [];

    tasks.forEach((task, index) => {
      const card = this.createTaskCard(task, index);
      this.container.add(card);
      this.taskCards.push(card);
    });
  }

  private createTaskCard(task: ContractTask, index: number): Phaser.GameObjects.Container {
    const card = this.scene.add.container(0, index * (this.CARD_HEIGHT + this.CARD_GAP));

    const frameKey = task.isLocked ? "contract_item" : "open_contract_item";
    const cardSprite = this.scene.add.image(0, 0, "ui", frameKey).setScale(0.8);
    card.add(cardSprite);

    card.setData("sprite", cardSprite);
    card.setData("isLocked", task.isLocked);

    if (!task.isLocked) {
      const frameName = ItemRegistry.getFrameName(task.targetLevel);
      const itemSprite = this.scene.add.image(0, -15, "squishes", frameName);
      const maxDim = Math.max(itemSprite.width, itemSprite.height);
      const scale = (90 / maxDim) * 0.9;
      itemSprite.setScale(scale);
      card.add(itemSprite);
      card.setData("itemSprite", itemSprite);

      const progressText = this.createProgressText(task);
      card.add(progressText);
      card.setData("progressText", progressText);
    } else {
      card.setData("itemSprite", null);
      card.setData("progressText", null);
    }

    return card;
  }

  private createProgressText(task: ContractTask): Phaser.GameObjects.BitmapText {
    let text = "";

    if (task.isCompleted) {
      text = "ГОТОВО";
    } else {
      text = `${task.currentCount} / ${task.requiredCount}`;
    }

    return this.scene.add.bitmapText(0, 40, "russo", text, 20).setOrigin(0.5);
  }

  // 🎯 НОВЫЙ МЕТОД: Обновление футера в зависимости от прогресса
  private updateFooter(tasks: ContractTask[]): void {
    const completedCount = tasks.filter((t) => t.isCompleted).length;
    const totalCount = tasks.length;
    const isFullyCompleted = completedCount === totalCount && totalCount > 0;

    // Позиционируем футер под последней карточкой
    // Учитываем, что карточки визуально меньше из-за scale(0.8)
    const visualCardHeight = this.CARD_HEIGHT * 0.8;
    const lastCardY = (totalCount - 1) * (this.CARD_HEIGHT + this.CARD_GAP);
    const footerY = lastCardY + visualCardHeight / 2 + this.FOOTER_OFFSET;
    this.footerContainer.y = footerY;

    if (isFullyCompleted) {
      // 🎯 Все задачи выполнены — показываем "Награда получена"
      this.overallProgressText.setVisible(false);
      this.rewardContainer.setVisible(false);
      this.completedText.setVisible(true);

      // Небольшая анимация появления
      this.completedText.setScale(0);
      this.scene.tweens.add({
        targets: this.completedText,
        scale: 1,
        duration: 300,
        ease: "Back.easeOut",
      });
    } else {
      // 🎯 Есть невыполненные задачи — показываем прогресс и награду
      this.overallProgressText.setVisible(true);
      this.rewardContainer.setVisible(true);
      this.completedText.setVisible(false);

      this.overallProgressText.setText(`${completedCount}/${totalCount}`);
    }
  }

  private animateCardUnlock(card: Phaser.GameObjects.Container, task: ContractTask): void {
    const cardSprite = card.getData("sprite") as Phaser.GameObjects.Image;

    this.scene.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 150,
      ease: "Quad.easeIn",
      onComplete: () => {
        cardSprite.setTexture("ui", "open_contract_item");

        const frameName = ItemRegistry.getFrameName(task.targetLevel);
        const itemSprite = this.scene.add.image(0, -15, "squishes", frameName);
        const maxDim = Math.max(itemSprite.width, itemSprite.height);
        const scale = (90 / maxDim) * 0.9;
        itemSprite.setScale(scale);
        card.add(itemSprite);
        card.setData("itemSprite", itemSprite);

        const progressText = this.createProgressText(task);
        card.add(progressText);
        card.setData("progressText", progressText);

        this.scene.tweens.add({
          targets: card,
          scaleX: 1,
          duration: 150,
          ease: "Quad.easeOut",
          onComplete: () => {
            this.scene.tweens.add({
              targets: card,
              scaleY: { from: 1, to: 1.05 },
              duration: 100,
              yoyo: true,
              ease: "Sine.easeOut",
            });
          },
        });
      },
    });
  }

  private updateProgress(data: ContractUpdateData): void {
    const contract = data.contract;

    if (contract.tasks.length !== this.taskCards.length) {
      this.renderTasks(contract.tasks);
      this.drawBackground(contract.tasks.length);
    }

    // 🎯 ОБНОВЛЯЕМ ФУТЕР при каждом изменении прогресса
    this.updateFooter(contract.tasks);

    contract.tasks.forEach((task, index) => {
      const card = this.taskCards[index];
      if (!card) return;

      const wasLocked = card.getData("isLocked") as boolean;

      if (wasLocked && !task.isLocked) {
        this.animateCardUnlock(card, task);
        card.setData("isLocked", false);
      } else if (!wasLocked && !task.isLocked) {
        const progressText = card.getData("progressText") as Phaser.GameObjects.BitmapText;
        if (progressText) {
          if (task.isCompleted) {
            progressText.setText("ГОТОВО");
            progressText.setTint(0x4caf50);
          } else {
            progressText.setText(`${task.currentCount} / ${task.requiredCount}`);
          }
        }
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

    // 🎯 Увеличиваем высоту фона, чтобы учесть футер
    const cardsHeight = taskCount * (this.CARD_HEIGHT + this.CARD_GAP);
    const footerSpace = 80; // Место для футера
    const totalHeight = cardsHeight + footerSpace;

    const panelWidth = this.CARD_WIDTH + 40;
    const panelHeight = totalHeight + 40;

    this.bgGraphics.fillStyle(0x0060b9, 0.65);
    this.bgGraphics.fillRoundedRect(-panelWidth / 2, -100, panelWidth, panelHeight, 20);
    this.bgGraphics.lineStyle(1, 0xffffff, 1);
    this.bgGraphics.strokeRoundedRect(-panelWidth / 2, -100, panelWidth, panelHeight, 20);
  }

  public destroy(): void {
    EventBus.off(GameEvents.CONTRACT_CREATED, this.renderContract, this);
    EventBus.off(GameEvents.CONTRACT_UPDATED, this.updateProgress, this);
    EventBus.off(GameEvents.CONTRACT_COMPLETED, this.onContractCompleted, this);
    this.container.destroy();
  }
}
