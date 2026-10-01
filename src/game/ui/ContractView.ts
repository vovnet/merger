import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { Contract, ContractService } from "../core/ContractService";
import { GameEvents } from "../types/GameEvents";
import { ItemRegistry } from "../core/ItemRegistry";

export class ContractView {
  private readonly scene: Phaser.Scene;
  private readonly contractService: ContractService;

  private readonly container: Phaser.GameObjects.Container;

  private readonly background: Phaser.GameObjects.Graphics;

  private itemSprite: Phaser.GameObjects.Image | null = null;

  private progressText: Phaser.GameObjects.BitmapText | null = null;
  private titleText: Phaser.GameObjects.BitmapText | null = null;

  private claimButton: Phaser.GameObjects.Container | null = null;
  private claimButtonBackground: Phaser.GameObjects.Image | null = null;
  private claimButtonText: Phaser.GameObjects.BitmapText | null = null;

  private visibleContractId: string | null = null;

  private readonly WIDTH = 180;
  private readonly HEIGHT = 250;

  constructor(scene: Phaser.Scene, contractService: ContractService) {
    this.scene = scene;
    this.contractService = contractService;

    this.container = scene.add.container(80, 150).setDepth(150).setVisible(false);

    this.background = scene.add.graphics();

    this.container.add(this.background);

    this.createStaticUI();
    this.bindEvents();

    /**
     * Очень важно:
     *
     * View может быть создан после того,
     * как ContractService уже создал контракт.
     *
     * Поэтому не рассчитываем только на EventBus.
     */
    const contract = this.contractService.getContract();

    if (contract) {
      this.render(contract);
    }
  }

  // ===========================================================================
  // CREATE
  // ===========================================================================

  private createStaticUI(): void {
    this.drawBackground();

    this.titleText = this.scene.add
      .bitmapText(0, -95, "russo", "КОНТРАКТ", 22)
      .setOrigin(0.5)
      .setTint(0xffffff);

    this.container.add(this.titleText);
  }

  private drawBackground(): void {
    this.background.clear();

    this.background.fillStyle(0x0060b9, 0.75);

    this.background.fillRoundedRect(-this.WIDTH / 2, -this.HEIGHT / 2, this.WIDTH, this.HEIGHT, 20);

    this.background.lineStyle(2, 0xffffff, 0.8);

    this.background.strokeRoundedRect(
      -this.WIDTH / 2,
      -this.HEIGHT / 2,
      this.WIDTH,
      this.HEIGHT,
      20,
    );
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  private bindEvents(): void {
    EventBus.on(GameEvents.CONTRACT_CREATED, this.handleContractCreated, this);

    EventBus.on(GameEvents.CONTRACT_UPDATED, this.handleContractUpdated, this);

    EventBus.on(GameEvents.CONTRACT_COMPLETED, this.handleContractCompleted, this);
  }

  private handleContractCreated(data: { contract: Contract | null }): void {
    if (!data.contract) {
      this.hide();
      return;
    }

    this.render(data.contract, true);
  }

  private handleContractUpdated(data: { contract: Contract | null }): void {
    if (!data.contract) {
      this.hide();
      return;
    }

    this.render(data.contract);
  }

  private handleContractCompleted(data: { contract: Contract | null }): void {
    if (!data.contract) {
      return;
    }

    this.render(data.contract);

    this.playCompletedAnimation();
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  private render(contract: Contract, animate = false): void {
    this.container.setVisible(true);

    /**
     * Если контракт действительно новый —
     * полностью перестраиваем содержимое.
     *
     * Если тот же контракт — просто обновляем прогресс.
     */
    const isNewContract = this.visibleContractId !== contract.id;

    if (isNewContract) {
      this.visibleContractId = contract.id;

      this.clearContractContent();

      this.createItem(contract);
      this.createProgress(contract);

      if (contract.status === "completed") {
        this.createClaimButton();
      }
    } else {
      this.updateItem(contract);
      this.updateProgress(contract);

      if (contract.status === "completed") {
        if (!this.claimButton) {
          this.createClaimButton();
        }
      } else {
        this.removeClaimButton();
      }
    }

    if (animate) {
      this.playAppearAnimation();
    }
  }

  // ===========================================================================
  // ITEM
  // ===========================================================================

  private createItem(contract: Contract): void {
    const frameName = ItemRegistry.getFrameName(contract.targetLevel);

    this.itemSprite = this.scene.add.image(0, -30, "squishes", frameName);

    const maxDimension = Math.max(this.itemSprite.width, this.itemSprite.height);

    const scale = (90 / maxDimension) * 0.9;

    this.itemSprite.setScale(scale);

    this.container.add(this.itemSprite);
  }

  private updateItem(contract: Contract): void {
    if (!this.itemSprite) {
      this.createItem(contract);
      return;
    }

    const frameName = ItemRegistry.getFrameName(contract.targetLevel);

    this.itemSprite.setFrame(frameName);
  }

  // ===========================================================================
  // PROGRESS
  // ===========================================================================

  private createProgress(contract: Contract): void {
    this.progressText = this.scene.add.bitmapText(0, 45, "russo", "", 24).setOrigin(0.5);

    this.container.add(this.progressText);

    this.updateProgress(contract);
  }

  private updateProgress(contract: Contract): void {
    if (!this.progressText) {
      return;
    }

    if (contract.status === "completed") {
      this.progressText.setText("ГОТОВО").setTint(0x4caf50);

      return;
    }

    this.progressText
      .setText(`${contract.currentCount} / ${contract.requiredCount}`)
      .setTint(0xffffff);
  }

  // ===========================================================================
  // CLAIM
  // ===========================================================================

  private createClaimButton(): void {
    if (this.claimButton) {
      return;
    }

    this.claimButton = this.scene.add.container(0, 90);

    this.claimButtonBackground = this.scene.add
      .image(0, 0, "ui", "settings_btn")
      .setScale(0.8)
      .setInteractive({ useHandCursor: true });

    this.claimButtonText = this.scene.add
      .bitmapText(0, 0, "russo", "ЗАБРАТЬ", 18)
      .setOrigin(0.5)
      .setTint(0xffffff);

    this.claimButton.add([this.claimButtonBackground, this.claimButtonText]);

    this.container.add(this.claimButton);

    this.claimButtonBackground.on(Phaser.Input.Events.POINTER_DOWN, this.handleClaimClick, this);

    this.claimButtonBackground.on(Phaser.Input.Events.POINTER_OVER, this.handleClaimHover, this);

    this.claimButtonBackground.on(Phaser.Input.Events.POINTER_OUT, this.handleClaimOut, this);

    this.claimButton.setScale(0);

    this.scene.tweens.add({
      targets: this.claimButton,
      scale: 1,
      duration: 250,
      ease: "Back.easeOut",
    });
  }

  private handleClaimClick(): void {
    /**
     * Повторная проверка на стороне сервиса.
     *
     * Даже если UI каким-то образом устарел,
     * сервис не выдаст награду незавершённому контракту.
     */
    const reward = this.contractService.claimReward();

    if (!reward) {
      return;
    }

    this.playClaimAnimation();
  }

  private handleClaimHover(): void {
    if (!this.claimButton) {
      return;
    }

    this.scene.tweens.add({
      targets: this.claimButton,
      scale: 1.05,
      duration: 100,
      ease: "Sine.easeOut",
    });
  }

  private handleClaimOut(): void {
    if (!this.claimButton) {
      return;
    }

    this.scene.tweens.add({
      targets: this.claimButton,
      scale: 1,
      duration: 100,
      ease: "Sine.easeOut",
    });
  }

  private removeClaimButton(): void {
    if (!this.claimButton) {
      return;
    }

    this.scene.tweens.killTweensOf(this.claimButton);

    this.claimButton.destroy();

    this.claimButton = null;
    this.claimButtonBackground = null;
    this.claimButtonText = null;
  }

  // ===========================================================================
  // CONTENT
  // ===========================================================================

  private clearContractContent(): void {
    if (this.itemSprite) {
      this.itemSprite.destroy();
      this.itemSprite = null;
    }

    if (this.progressText) {
      this.progressText.destroy();
      this.progressText = null;
    }

    this.removeClaimButton();
  }

  // ===========================================================================
  // ANIMATIONS
  // ===========================================================================

  private playAppearAnimation(): void {
    this.scene.tweens.killTweensOf(this.container);

    this.container.setScale(0);

    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 350,
      ease: "Back.easeOut",
    });
  }

  private playCompletedAnimation(): void {
    this.scene.tweens.add({
      targets: this.container,
      scale: {
        from: 1,
        to: 1.08,
      },
      duration: 180,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeOut",
    });
  }

  private playClaimAnimation(): void {
    this.scene.tweens.add({
      targets: this.container,
      scale: {
        from: 1,
        to: 1.12,
      },
      duration: 120,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeOut",
    });
  }

  // ===========================================================================
  // VISIBILITY
  // ===========================================================================

  private hide(): void {
    this.scene.tweens.killTweensOf(this.container);

    this.container.setVisible(false);

    this.visibleContractId = null;

    this.clearContractContent();
  }

  // ===========================================================================
  // DESTROY
  // ===========================================================================

  public destroy(): void {
    EventBus.off(GameEvents.CONTRACT_CREATED, this.handleContractCreated, this);

    EventBus.off(GameEvents.CONTRACT_UPDATED, this.handleContractUpdated, this);

    EventBus.off(GameEvents.CONTRACT_COMPLETED, this.handleContractCompleted, this);

    if (this.claimButtonBackground) {
      this.claimButtonBackground.off(Phaser.Input.Events.POINTER_DOWN, this.handleClaimClick, this);

      this.claimButtonBackground.off(Phaser.Input.Events.POINTER_OVER, this.handleClaimHover, this);

      this.claimButtonBackground.off(Phaser.Input.Events.POINTER_OUT, this.handleClaimOut, this);
    }

    this.scene.tweens.killTweensOf(this.container);

    this.container.destroy();

    this.taskCleanup();
  }

  private taskCleanup(): void {
    this.itemSprite = null;
    this.progressText = null;
    this.claimButton = null;
    this.claimButtonBackground = null;
    this.claimButtonText = null;
  }
}
