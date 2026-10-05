import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { Contract, ContractService } from "../core/ContractService";
import { GameEvents } from "../types/GameEvents";
import { ItemRegistry } from "../core/ItemRegistry";
import { AudioService } from "../core/AudioService";
import { t } from "../../locales";

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

  private claimHitArea: Phaser.GameObjects.Zone | null = null;
  private claimText: Phaser.GameObjects.BitmapText | null = null;

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
  private readonly HEIGHT = 210;

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
      .bitmapText(0, -80, "russo", t("CONTRACT"), 22)
      .setOrigin(0.5)
      .setTint(0x90cdff);

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
        this.createClaimInteraction();
      }
    } else {
      if (contract.status === "completed") {
        this.removeItem();

        if (!this.rewardPlaceholder) {
          this.createRewardPlaceholder();
        }

        if (!this.claimHitArea) {
          this.createClaimInteraction();
        }
      } else {
        this.removeRewardPlaceholder();
        this.removeClaimInteraction();

        if (!this.itemSprite) {
          this.createItem(contract);
        }

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

    this.itemSprite = this.scene.add.image(0, -10, "squishes", frameName);

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

    const ticket = this.scene.add.image(0, 20, "ui", "ticket");

    const coinText = this.scene.add
      .bitmapText(0, 68, "russo", `+${this.contractService.getReward()}`, 38)
      .setOrigin(0.5)
      .setTint(0xfffc5e);

    this.rewardPlaceholder.add([ticket, coinText]);

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
    this.progressText = this.scene.add
      .bitmapText(0, 60, "russo", "", 32)
      .setOrigin(0.5)
      .setTint(0xfff171);

    this.container.add(this.progressText);

    this.updateProgress(contract);
  }

  private updateProgress(contract: Contract): void {
    if (!this.progressText) {
      return;
    }

    if (contract.status === "completed") {
      this.progressText.setVisible(false);
      return;
    }

    this.progressText
      .setText(`${contract.currentCount} / ${contract.requiredCount}`)
      .setVisible(true);
  }

  // ===========================================================================
  // CLAIM
  // ===========================================================================

  private createClaimInteraction(): void {
    if (this.claimHitArea) {
      return;
    }

    /**
     * Прозрачная область размером со всей карточкой.
     *
     * Она находится внутри container, поэтому
     * кликабельным становится весь контракт.
     */
    this.claimHitArea = this.scene.add
      .zone(0, 0, this.WIDTH, this.HEIGHT)
      .setOrigin(0.5)
      .setInteractive({
        useHandCursor: true,
      });

    this.container.add(this.claimHitArea);

    this.claimHitArea.on(Phaser.Input.Events.POINTER_DOWN, this.handleClaimClick, this);

    this.claimHitArea.on(Phaser.Input.Events.POINTER_OVER, this.handleClaimHover, this);

    this.claimHitArea.on(Phaser.Input.Events.POINTER_OUT, this.handleClaimOut, this);

    /**
     * Текст остаётся поверх reward placeholder/progress.
     */
    this.claimText = this.scene.add
      .bitmapText(0, 80, "russo", t("REWARD_RECEIVE"), 18)
      .setOrigin(0.5)
      .setTint(0xffffff);

    this.container.add(this.claimText);

    /**
     * Hit area добавляем последним, но делаем его
     * прозрачным. Чтобы текст/графика не мешали клику,
     * Zone будет принимать input.
     */

    this.scene.tweens.add({
      targets: [this.claimText],
      alpha: {
        from: 0,
        to: 1,
      },
      duration: 200,
      ease: "Sine.easeOut",
    });
  }

  private handleClaimClick(): void {
    if (this.isClaimAnimating) {
      return;
    }

    if (!this.contractService.canClaimReward()) {
      return;
    }

    const reward = this.contractService.claimReward();

    this.spawnResourcePopup(150, 200, reward?.coins || 0, "ticket");

    if (!reward) {
      return;
    }

    this.audioService.playNotificationSound_2();
  }

  public spawnResourcePopup(px: number, py: number, amount: number, iconKey: string): void {
    const randomXOffset = Phaser.Math.Between(-30, 30);
    const randomAngle = Phaser.Math.FloatBetween(-15, 15);
    const startX = px + randomXOffset;

    // 🎯 Создаем контейнер, чтобы анимировать иконку и текст как единое целое
    const popupContainer = this.scene.add.container(startX, py - 30).setDepth(1000);

    // 1. Иконка награды
    const icon = this.scene.add
      .sprite(-45, -15, "ui", iconKey) // Сдвинут влево и чуть вверх для визуального баланса с текстом
      .setOrigin(0.5, 0.5)
      .setScale(0.8); // Чуть меньше текста, чтобы выглядеть гармонично

    // 2. Текст награды
    const text = this.scene.add
      .bitmapText(0, 0, "russo", `+${amount}`, 32) // Фиксированный крупный размер для лучшей читаемости
      .setTint(0xecc900)
      .setOrigin(0.5, 1); // Выравнивание по нижней границе

    // Добавляем оба объекта в контейнер
    popupContainer.add([icon, text]);
    popupContainer.setAngle(randomAngle);

    // Начальное состояние для анимации появления
    popupContainer.setScale(0.5);
    popupContainer.setAlpha(0);

    // 🎯 ЭТАП 1: Появление (Pop) - чуть дольше и плавнее
    this.scene.tweens.add({
      targets: popupContainer,
      scale: 1.15, // Чуть больший "перелет" для сочности
      alpha: 1,
      duration: 150, // Было 120
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: popupContainer,
          scale: 1.0,
          duration: 100, // Было 80
          ease: "Power2.out",
        });
      },
    });

    // 🎯 ЭТАП 2: Движение вверх - медленнее и чуть выше
    this.scene.tweens.add({
      targets: popupContainer,
      y: py - 140, // Было -120 (теперь выше, чтобы дольше было видно)
      duration: 800, // Было 600
      delay: 100, // Было 80
      ease: "Cubic.out",
    });

    // 🎯 ЭТАП 3: Исчезновение - начинается ПОСЛЕ того, как объект поднялся
    // Задержка = delay (100) + duration (800) = 900мс
    this.scene.tweens.add({
      targets: popupContainer,
      alpha: 0,
      duration: 300, // Было 200 (более плавное растворение)
      delay: 900,
      ease: "Power2.in",
      onComplete: () => {
        // Уничтожение контейнера автоматически уничтожит и иконку, и текст внутри него
        popupContainer.destroy();
      },
    });
  }

  private handleClaimHover(): void {
    if (this.isClaimAnimating) {
      return;
    }

    this.scene.tweens.add({
      targets: this.background,
      alpha: 0.85,
      duration: 120,
      ease: "Sine.easeOut",
    });

    if (this.claimText) {
      this.claimText.setTint(0xffd54f);
    }
  }

  private handleClaimOut(): void {
    if (this.isClaimAnimating) {
      return;
    }

    this.scene.tweens.add({
      targets: this.background,
      alpha: 1,
      duration: 120,
      ease: "Sine.easeOut",
    });

    if (this.claimText) {
      this.claimText.setTint(0xffffff);
    }
  }

  private removeClaimInteraction(): void {
    if (this.claimHitArea) {
      this.scene.tweens.killTweensOf(this.claimHitArea);

      this.claimHitArea.off(Phaser.Input.Events.POINTER_DOWN, this.handleClaimClick, this);

      this.claimHitArea.off(Phaser.Input.Events.POINTER_OVER, this.handleClaimHover, this);

      this.claimHitArea.off(Phaser.Input.Events.POINTER_OUT, this.handleClaimOut, this);

      this.claimHitArea.destroy();

      this.claimHitArea = null;
    }

    if (this.claimText) {
      this.scene.tweens.killTweensOf(this.claimText);
      this.claimText.destroy();
      this.claimText = null;
    }

    this.background.setAlpha(1);
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

    this.removeClaimInteraction();
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

    this.removeClaimInteraction();

    this.container.destroy();

    this.taskCleanup();
  }

  private taskCleanup(): void {
    this.itemSprite = null;
    this.rewardPlaceholder = null;
    this.progressText = null;
    this.titleText = null;

    this.claimText = null;
    this.claimHitArea = null;

    this.visibleContractId = null;
    this.isClaimAnimating = false;
  }
}
