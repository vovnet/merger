import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { Contract, ContractService } from "../core/ContractService";
import { GameEvents } from "../types/GameEvents";
import { ItemRegistry } from "../core/ItemRegistry";
import { AudioService } from "../core/AudioService";

export class ContractView {
  private readonly scene: Phaser.Scene;
  private readonly contractService: ContractService;

  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;

  private audioService: AudioService;

  private itemSprite: Phaser.GameObjects.Image | null = null;
  private rewardPlaceholder: Phaser.GameObjects.Container | null = null;

  private progressText: Phaser.GameObjects.BitmapText | null = null;
  private titleText: Phaser.GameObjects.BitmapText | null = null;

  private claimButton: Phaser.GameObjects.Container | null = null;
  private claimButtonBackground: Phaser.GameObjects.Image | null = null;
  private claimButtonText: Phaser.GameObjects.BitmapText | null = null;

  /**
   * ID контракта, который сейчас отображается.
   */
  private visibleContractId: string | null = null;

  /**
   * Во время этой анимации View игнорирует
   * CONTRACT_CREATED / CONTRACT_UPDATED.
   *
   * Это нужно потому, что ContractService создаёт
   * новый контракт сразу после claimReward().
   */
  private isClaimAnimating = false;

  private readonly WIDTH = 180;
  private readonly HEIGHT = 250;

  constructor(scene: Phaser.Scene, contractService: ContractService, audioService: AudioService) {
    this.scene = scene;
    this.contractService = contractService;
    this.audioService = audioService;

    this.container = scene.add.container(150, 150).setDepth(150).setVisible(false);

    this.background = scene.add.graphics();

    this.container.add(this.background);

    this.createStaticUI();
    this.bindEvents();

    /**
     * View может быть создан после ContractService.
     *
     * Поэтому сразу проверяем текущее состояние.
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

    EventBus.on(GameEvents.CONTRACT_REWARD_CLAIMED, this.handleRewardClaimed, this);
  }

  private handleContractCreated(data: { contract: Contract | null }): void {
    /**
     * Во время анимации claim старый UI
     * должен спокойно исчезнуть.
     *
     * Новый контракт показываем только
     * после завершения анимации.
     */
    if (this.isClaimAnimating) {
      return;
    }

    if (!data.contract) {
      this.hide();
      return;
    }

    this.audioService.playNotificationSound_1();
    this.render(data.contract, true);
  }

  private handleContractUpdated(data: { contract: Contract | null }): void {
    if (this.isClaimAnimating) {
      return;
    }

    if (!data.contract) {
      this.hide();
      return;
    }

    this.render(data.contract);
  }

  private handleContractCompleted(data: { contract: Contract | null }): void {
    if (this.isClaimAnimating) {
      return;
    }

    if (!data.contract) {
      return;
    }

    this.render(data.contract);

    this.playCompletedAnimation();
  }

  /**
   * Вызывается после успешной выдачи награды сервисом.
   *
   * Сам сервис уже создал новый контракт.
   * Мы пока его не показываем, а сначала красиво
   * убираем старый.
   */
  private handleRewardClaimed(): void {
    if (this.isClaimAnimating) {
      return;
    }

    this.isClaimAnimating = true;

    this.playClaimAnimation(() => {
      this.isClaimAnimating = false;

      const contract = this.contractService.getContract();

      if (!contract) {
        this.hide();
        return;
      }

      this.render(contract, true);
    });
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  private render(contract: Contract, animate = false): void {
    this.container.setVisible(true);

    const isNewContract = this.visibleContractId !== contract.id;

    if (isNewContract) {
      this.visibleContractId = contract.id;

      this.clearContractContent();

      if (contract.status === "completed") {
        this.createRewardPlaceholder();
      } else {
        this.createItem(contract);
      }

      this.createProgress(contract);

      if (contract.status === "completed") {
        this.createClaimButton();
      }
    } else {
      /**
       * Текущий контракт изменился,
       * но сам контракт тот же.
       */
      if (contract.status === "completed") {
        this.removeItem();

        if (!this.rewardPlaceholder) {
          this.createRewardPlaceholder();
        }

        if (!this.claimButton) {
          this.createClaimButton();
        }
      } else {
        this.removeRewardPlaceholder();

        if (!this.itemSprite) {
          this.createItem(contract);
        }

        this.removeClaimButton();

        this.updateItem(contract);
      }

      this.updateProgress(contract);
    }

    if (animate) {
      this.playAppearAnimation();
    }
  }

  // ===========================================================================
  // ITEM
  // ===========================================================================

  private createItem(contract: Contract): void {
    if (this.itemSprite) {
      return;
    }

    const frameName = ItemRegistry.getFrameName(contract.targetLevel);

    this.itemSprite = this.scene.add.image(0, -30, "squishes", frameName);

    const maxDimension = Math.max(this.itemSprite.width, this.itemSprite.height);

    const scale = (90 / maxDimension) * 0.9;

    this.itemSprite.setScale(scale);

    this.container.add(this.itemSprite);
  }

  private updateItem(contract: Contract): void {
    if (contract.status === "completed") {
      return;
    }

    if (!this.itemSprite) {
      this.createItem(contract);
      return;
    }

    const frameName = ItemRegistry.getFrameName(contract.targetLevel);

    this.itemSprite.setFrame(frameName);
  }

  private removeItem(): void {
    if (!this.itemSprite) {
      return;
    }

    this.itemSprite.destroy();
    this.itemSprite = null;
  }

  // ===========================================================================
  // REWARD
  // ===========================================================================

  /**
   * Заглушка награды.
   *
   * Пока вместо настоящей иконки монет
   * рисуем золотую монету.
   */
  private createRewardPlaceholder(): void {
    if (this.rewardPlaceholder) {
      return;
    }

    this.rewardPlaceholder = this.scene.add.container(0, -30);

    const glow = this.scene.add.graphics();

    glow.fillStyle(0xffc107, 0.15);
    glow.fillCircle(0, 0, 48);

    glow.lineStyle(2, 0xffd54f, 0.8);
    glow.strokeCircle(0, 0, 48);

    const coin = this.scene.add.graphics();

    coin.fillStyle(0xffc107, 1);
    coin.fillCircle(0, 0, 32);

    coin.lineStyle(3, 0xfff3a0, 1);
    coin.strokeCircle(0, 0, 32);

    const coinText = this.scene.add
      .bitmapText(0, 0, "russo", "¢", 28)
      .setOrigin(0.5)
      .setTint(0xffffff);

    this.rewardPlaceholder.add([glow, coin, coinText]);

    this.container.add(this.rewardPlaceholder);

    this.rewardPlaceholder.setScale(0);

    this.scene.tweens.add({
      targets: this.rewardPlaceholder,
      scale: 1,
      duration: 250,
      ease: "Back.easeOut",
    });
  }

  private removeRewardPlaceholder(): void {
    if (!this.rewardPlaceholder) {
      return;
    }

    this.scene.tweens.killTweensOf(this.rewardPlaceholder);

    this.rewardPlaceholder.destroy();

    this.rewardPlaceholder = null;
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
      this.progressText.setText("+100").setTint(0xffd54f);

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
      .setInteractive({
        useHandCursor: true,
      });

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
    if (this.isClaimAnimating) {
      return;
    }

    /**
     * Дополнительная защита от повторного клика.
     */
    if (!this.contractService.canClaimReward()) {
      return;
    }

    const reward = this.contractService.claimReward();

    if (!reward) {
      return;
    }

    this.audioService.playNotificationSound_2();

    /**
     * Саму анимацию запускаем через
     * CONTRACT_REWARD_CLAIMED.
     */
  }

  private handleClaimHover(): void {
    if (!this.claimButton || this.isClaimAnimating) {
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
    if (!this.claimButton || this.isClaimAnimating) {
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

    if (this.claimButtonBackground) {
      this.claimButtonBackground.off(Phaser.Input.Events.POINTER_DOWN, this.handleClaimClick, this);

      this.claimButtonBackground.off(Phaser.Input.Events.POINTER_OVER, this.handleClaimHover, this);

      this.claimButtonBackground.off(Phaser.Input.Events.POINTER_OUT, this.handleClaimOut, this);
    }

    this.claimButton.destroy();

    this.claimButton = null;
    this.claimButtonBackground = null;
    this.claimButtonText = null;
  }

  // ===========================================================================
  // CONTENT
  // ===========================================================================

  private clearContractContent(): void {
    this.removeItem();
    this.removeRewardPlaceholder();

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

    this.container.setAlpha(1);
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

  /**
   * Анимация получения награды.
   *
   * Старый контракт плавно исчезает.
   * После этого callback получает уже новый контракт.
   */
  private playClaimAnimation(onComplete: () => void): void {
    this.scene.tweens.killTweensOf(this.container);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.85,
      duration: 300,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.container.setAlpha(1);
        this.container.setScale(1);

        this.clearContractContent();

        onComplete();
      },
    });
  }

  // ===========================================================================
  // VISIBILITY
  // ===========================================================================

  private hide(): void {
    this.scene.tweens.killTweensOf(this.container);

    this.container.setVisible(false);
    this.container.setAlpha(1);
    this.container.setScale(1);

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
    EventBus.off(GameEvents.CONTRACT_REWARD_CLAIMED, this.handleRewardClaimed, this);

    this.scene.tweens.killTweensOf(this.container);

    this.removeClaimButton();

    this.container.destroy();

    this.taskCleanup();
  }

  private taskCleanup(): void {
    this.itemSprite = null;
    this.rewardPlaceholder = null;
    this.progressText = null;
    this.titleText = null;
    this.claimButton = null;
    this.claimButtonBackground = null;
    this.claimButtonText = null;

    this.visibleContractId = null;
    this.isClaimAnimating = false;
  }
}
