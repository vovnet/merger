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

  // Эти константы теперь отвечают только за РАССТОЯНИЕ между карточками
  private readonly CARD_WIDTH = 120;
  private readonly CARD_HEIGHT = 140;
  private readonly CARD_GAP = 30;
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
    // 🎯 1. УБРАЛИ card.setScale(0.5). Теперь база = 1.
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

      // 🎯 3. Размер предмета теперь честный.
      // Он будет визуально занимать ~90px на экране. Никаких умножений на 2!
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

    // 🎯 4. Размер шрифта теперь честный. 20px — это отличный, читаемый размер.
    return this.scene.add.bitmapText(0, 40, "russo", text, 20).setOrigin(0.5);
  }

  private animateCardUnlock(card: Phaser.GameObjects.Container, task: ContractTask): void {
    const cardSprite = card.getData("sprite") as Phaser.GameObjects.Image;

    // Фаза 1: Сжимаем по горизонтали до 0 (переворот)
    this.scene.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 150,
      ease: "Quad.easeIn",
      onComplete: () => {
        // Фаза 2: Меняем визуал в момент "невидимости"
        cardSprite.setTexture("ui", "open_contract_item");

        // Создаем предмет
        const frameName = ItemRegistry.getFrameName(task.targetLevel);
        const itemSprite = this.scene.add.image(0, -15, "squishes", frameName);
        const maxDim = Math.max(itemSprite.width, itemSprite.height);
        const scale = (90 / maxDim) * 0.9; // Честный размер, без компенсаций
        itemSprite.setScale(scale);
        card.add(itemSprite);
        card.setData("itemSprite", itemSprite);

        // Создаем текст
        const progressText = this.createProgressText(task);
        card.add(progressText);
        card.setData("progressText", progressText);

        // Фаза 3: Разворачиваем карточку обратно
        this.scene.tweens.add({
          targets: card,
          scaleX: 1, // Возвращаем к нормальному состоянию (1)
          duration: 150,
          ease: "Quad.easeOut",
          onComplete: () => {
            // 🎯 5. ИСПРАВЛЕН "ПОДСКОК": теперь от 1 до 1.05 (а не от 0.5)
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
      return;
    }

    contract.tasks.forEach((task, index) => {
      const card = this.taskCards[index];
      if (!card) return;

      const wasLocked = card.getData("isLocked") as boolean;

      if (wasLocked && !task.isLocked) {
        this.animateCardUnlock(card, task);
        card.setData("isLocked", false);
      } else if (!wasLocked && !task.isLocked) {
        // 🎯 Исправлен тип каста на BitmapText для строгости TypeScript
        const progressText = card.getData("progressText") as Phaser.GameObjects.BitmapText;
        if (progressText) {
          if (task.isCompleted) {
            progressText.setText("✅ ГОТОВО");
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
