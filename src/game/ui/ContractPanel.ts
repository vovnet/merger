import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { ContractTask, ContractUpdateData } from "../types/Contract";
import { ItemRegistry } from "../core/ItemRegistry";
import { ContractService } from "../core/ContractService";

export class ContractPanel {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly contractService: ContractService;

  private taskCards: Phaser.GameObjects.Container[] = [];

  private bgGraphics!: Phaser.GameObjects.Graphics;

  private footerContainer!: Phaser.GameObjects.Container;
  private overallProgressText!: Phaser.GameObjects.BitmapText;
  private rewardContainer!: Phaser.GameObjects.Container;
  private completedText!: Phaser.GameObjects.BitmapText;

  private readonly CARD_WIDTH = 120;
  private readonly CARD_HEIGHT = 140;
  private readonly CARD_GAP = 30;

  private readonly FOOTER_OFFSET = 50;

  private readonly PANEL_X = 80;
  private readonly PANEL_Y = 150;

  constructor(scene: Phaser.Scene, contractService: ContractService) {
    this.scene = scene;
    this.contractService = contractService;

    this.container = scene.add
      .container(this.PANEL_X, this.PANEL_Y)
      .setDepth(150)
      .setVisible(false);

    this.createVisuals();
    this.createFooter();
    this.bindEvents();

    /**
     * Важный момент:
     *
     * ContractPanel может быть создан:
     *
     * 1. до загрузки save;
     * 2. после загрузки save;
     * 3. при новой игре.
     *
     * Поэтому сначала пытаемся отрисовать уже существующий контракт,
     * а если его нет — просто ждём CONTRACT_CREATED / CONTRACT_UPDATED.
     */
    const existingContract = this.contractService.getActiveContract();

    if (existingContract) {
      this.handleContractChanged({
        contract: existingContract,
        activeTargetLevel: this.contractService.getActiveTargetLevel(),
      });
    }
  }

  // ===========================================================================
  // CREATE
  // ===========================================================================

  private createVisuals(): void {
    this.bgGraphics = this.scene.add.graphics();

    this.container.add(this.bgGraphics);
  }

  private createFooter(): void {
    this.footerContainer = this.scene.add.container(0, 0);

    // -------------------------------------------------------------------------
    // Overall progress
    // -------------------------------------------------------------------------

    this.overallProgressText = this.scene.add
      .bitmapText(0, 0, "russo", "0/0", 26)
      .setOrigin(0.5)
      .setTint(0xffd700);

    this.footerContainer.add(this.overallProgressText);

    // -------------------------------------------------------------------------
    // Reward
    // -------------------------------------------------------------------------

    this.rewardContainer = this.scene.add.container(0, 35);

    const ticketSprite = this.scene.add.image(-20, 6, "ui", "ticket").setScale(0.6).setOrigin(0.5);

    const rewardText = this.scene.add
      .bitmapText(5, 0, "russo", "+5", 24)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);

    this.rewardContainer.add([ticketSprite, rewardText]);

    this.footerContainer.add(this.rewardContainer);

    // -------------------------------------------------------------------------
    // Completed
    // -------------------------------------------------------------------------

    this.completedText = this.scene.add
      .bitmapText(0, 15, "russo", "ВЫПОЛНЕНО", 18)
      .setOrigin(0.5)
      .setTint(0x4caf50)
      .setVisible(false);

    this.footerContainer.add(this.completedText);

    this.container.add(this.footerContainer);
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  private bindEvents(): void {
    EventBus.on(GameEvents.CONTRACT_CREATED, this.handleContractChanged, this);

    EventBus.on(GameEvents.CONTRACT_UPDATED, this.handleContractChanged, this);

    EventBus.on(GameEvents.CONTRACT_COMPLETED, this.onContractCompleted, this);

    EventBus.on(GameEvents.GAME_READY, this.syncFromService, this);
  }

  private syncFromService(): void {
    const contract = this.contractService.getActiveContract();

    if (!contract) {
      this.hide();
      return;
    }

    this.handleContractChanged({
      contract,
      activeTargetLevel: this.contractService.getActiveTargetLevel(),
    });
  }

  // ===========================================================================
  // CONTRACT
  // ===========================================================================

  /**
   * Единая точка входа для создания / загрузки / обновления контракта.
   */
  private handleContractChanged(data: ContractUpdateData): void {
    const contract = data.contract;

    /**
     * null означает, что активного контракта нет.
     */
    if (!contract) {
      this.hide();

      return;
    }

    const isNewContract =
      this.taskCards.length === 0 || this.taskCards.length !== contract.tasks.length;

    this.container.setVisible(true);

    if (isNewContract) {
      this.renderContract(contract);
      return;
    }

    this.updateTaskCards(contract.tasks);
    this.updateFooter(contract.tasks);
  }

  /**
   * Полностью рисует новый контракт.
   */
  private renderContract(contract: NonNullable<ContractUpdateData["contract"]>): void {
    this.renderTasks(contract.tasks);

    this.updateFooter(contract.tasks);

    this.drawBackground(contract.tasks.length);

    /**
     * Анимация появления нужна только для нового
     * визуального контракта.
     */
    this.container.setScale(0);

    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
    });
  }

  /**
   * Скрывает панель, когда активного контракта нет.
   */
  private hide(): void {
    this.scene.tweens.killTweensOf(this.container);

    this.container.setVisible(false);
  }

  // ===========================================================================
  // TASK CARDS
  // ===========================================================================

  private renderTasks(tasks: ContractTask[]): void {
    /**
     * Уничтожаем старые карточки.
     */
    this.taskCards.forEach((card) => {
      card.destroy();
    });

    this.taskCards = [];

    /**
     * Создаём новые.
     */
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
      this.addUnlockedTaskContent(card, task);
    } else {
      card.setData("itemSprite", null);

      card.setData("progressText", null);
    }

    return card;
  }

  private addUnlockedTaskContent(card: Phaser.GameObjects.Container, task: ContractTask): void {
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
  }

  private createProgressText(task: ContractTask): Phaser.GameObjects.BitmapText {
    const text = task.isCompleted ? "ГОТОВО" : `${task.currentCount} / ${task.requiredCount}`;

    const bitmapText = this.scene.add.bitmapText(0, 40, "russo", text, 20).setOrigin(0.5);

    if (task.isCompleted) {
      bitmapText.setTint(0x4caf50);
    }

    return bitmapText;
  }

  // ===========================================================================
  // TASK UPDATE
  // ===========================================================================

  private updateTaskCards(tasks: ContractTask[]): void {
    tasks.forEach((task, index) => {
      const card = this.taskCards[index];

      if (!card) {
        return;
      }

      const wasLocked = card.getData("isLocked") as boolean;

      /**
       * Карточка только что разблокировалась.
       */
      if (wasLocked && !task.isLocked) {
        this.animateCardUnlock(card, task);

        card.setData("isLocked", false);

        return;
      }

      /**
       * Карточка уже была открыта.
       */
      if (!task.isLocked) {
        this.updateCardProgress(card, task);
      }
    });
  }

  private updateCardProgress(card: Phaser.GameObjects.Container, task: ContractTask): void {
    const progressText = card.getData("progressText") as Phaser.GameObjects.BitmapText | null;

    /**
     * Теоретически такого быть не должно,
     * но это делает компонент устойчивым.
     */
    if (!progressText) {
      return;
    }

    if (task.isCompleted) {
      progressText.setText("ГОТОВО").setTint(0x4caf50);

      return;
    }

    progressText.setText(`${task.currentCount} / ${task.requiredCount}`).clearTint();
  }

  // ===========================================================================
  // UNLOCK ANIMATION
  // ===========================================================================

  private animateCardUnlock(card: Phaser.GameObjects.Container, task: ContractTask): void {
    const cardSprite = card.getData("sprite") as Phaser.GameObjects.Image;

    this.scene.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 150,
      ease: "Quad.easeIn",

      onComplete: () => {
        /**
         * Меняем locked frame.
         */
        cardSprite.setTexture("ui", "open_contract_item");

        /**
         * Добавляем предмет.
         */
        const frameName = ItemRegistry.getFrameName(task.targetLevel);

        const itemSprite = this.scene.add.image(0, -15, "squishes", frameName);

        const maxDim = Math.max(itemSprite.width, itemSprite.height);

        const scale = (90 / maxDim) * 0.9;

        itemSprite.setScale(scale);

        card.add(itemSprite);

        card.setData("itemSprite", itemSprite);

        /**
         * Добавляем progress text.
         */
        const progressText = this.createProgressText(task);

        card.add(progressText);

        card.setData("progressText", progressText);

        /**
         * Вторая половина анимации.
         */
        this.scene.tweens.add({
          targets: card,
          scaleX: 1,
          duration: 150,
          ease: "Quad.easeOut",

          onComplete: () => {
            this.scene.tweens.add({
              targets: card,
              scaleY: {
                from: 1,
                to: 1.05,
              },
              duration: 100,
              yoyo: true,
              ease: "Sine.easeOut",
            });
          },
        });
      },
    });
  }

  // ===========================================================================
  // FOOTER
  // ===========================================================================

  private updateFooter(tasks: ContractTask[]): void {
    const completedCount = tasks.filter((task) => task.isCompleted).length;

    const totalCount = tasks.length;

    const isFullyCompleted = totalCount > 0 && completedCount === totalCount;

    /**
     * Позиция футера.
     */
    const visualCardHeight = this.CARD_HEIGHT * 0.8;

    const lastCardY = (totalCount - 1) * (this.CARD_HEIGHT + this.CARD_GAP);

    const footerY = lastCardY + visualCardHeight / 2 + this.FOOTER_OFFSET;

    this.footerContainer.y = footerY;

    if (isFullyCompleted) {
      this.showCompletedFooter();
      return;
    }

    this.showProgressFooter(completedCount, totalCount);
  }

  private showProgressFooter(completedCount: number, totalCount: number): void {
    this.overallProgressText.setVisible(true).setText(`${completedCount}/${totalCount}`);

    this.rewardContainer.setVisible(true);

    this.completedText.setVisible(false);
  }

  private showCompletedFooter(): void {
    this.overallProgressText.setVisible(false);

    this.rewardContainer.setVisible(false);

    this.completedText.setVisible(true).setScale(0);

    this.scene.tweens.add({
      targets: this.completedText,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut",
    });
  }

  // ===========================================================================
  // CONTRACT COMPLETED
  // ===========================================================================

  private onContractCompleted(data: ContractUpdateData): void {
    if (!data.contract) {
      return;
    }

    this.scene.tweens.add({
      targets: this.container,
      scale: {
        from: 1,
        to: 1.15,
      },
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: "Power2",
    });
  }

  // ===========================================================================
  // BACKGROUND
  // ===========================================================================

  private drawBackground(taskCount: number): void {
    this.bgGraphics.clear();

    const cardsHeight = taskCount * (this.CARD_HEIGHT + this.CARD_GAP);

    const footerSpace = 80;

    const totalHeight = cardsHeight + footerSpace;

    const panelWidth = this.CARD_WIDTH + 40;

    const panelHeight = totalHeight + 40;

    this.bgGraphics.fillStyle(0x0060b9, 0.65);

    this.bgGraphics.fillRoundedRect(-panelWidth / 2, -100, panelWidth, panelHeight, 20);

    this.bgGraphics.lineStyle(1, 0xffffff, 1);

    this.bgGraphics.strokeRoundedRect(-panelWidth / 2, -100, panelWidth, panelHeight, 20);
  }

  // ===========================================================================
  // DESTROY
  // ===========================================================================

  public destroy(): void {
    EventBus.off(GameEvents.CONTRACT_CREATED, this.handleContractChanged, this);

    EventBus.off(GameEvents.CONTRACT_UPDATED, this.handleContractChanged, this);

    EventBus.off(GameEvents.CONTRACT_COMPLETED, this.onContractCompleted, this);

    EventBus.off(GameEvents.GAME_READY, this.syncFromService, this);

    this.scene.tweens.killTweensOf(this.container);

    this.container.destroy();

    this.taskCards = [];
  }
}
