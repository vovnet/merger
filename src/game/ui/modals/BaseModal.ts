import * as Phaser from "phaser";
import { EventBus } from "../../core/EventBus";
import { UIEvents } from "../../types/GameEvents";

export abstract class BaseModal {
  protected scene: Phaser.Scene;
  protected container: Phaser.GameObjects.Container;
  protected bg: Phaser.GameObjects.Rectangle;
  protected isOpen: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 1. Создаем затемненный фон на весь экран
    this.bg = this.scene.add
      .rectangle(
        0,
        0,
        this.scene.scale.width,
        this.scene.scale.height,
        0x000000,
        0.7, // Черный с прозрачностью 70%
      )
      .setOrigin(0)
      .setDepth(900);
    // .setInteractive();

    // Закрытие по клику на затемненный фон
    // this.bg.on("pointerdown", () => this.close());

    // 2. Создаем основной контейнер модалки (будет по центру)
    this.container = this.scene.add
      .container(this.scene.scale.width / 2, this.scene.scale.height / 2)
      .setDepth(1000)
      .setInteractive();
  }

  // 🎯 Этот метод должны переопределять дочерние классы для отрисовки своего UI
  protected abstract buildUI(): void;

  // 🎯 Публичный метод открытия
  public open(data?: any): void {
    if (this.isOpen) return;
    this.isOpen = true;

    this.buildUI(); // Рисуем содержимое

    // Анимация появления: фон проявляется, модалка "выпрыгивает"
    this.bg.setAlpha(0);
    this.container.setScale(0.8);

    this.scene.tweens.add({
      targets: this.bg,
      alpha: 1,
      duration: 100,
      ease: "Power2.out",
    });

    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 100,
      ease: "Back.easeOut",
    });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;

    //  Анимация фона: ТОЛЬКО альфа-канал
    this.scene.tweens.add({
      targets: this.bg,
      alpha: 0,
      duration: 100,
      ease: "Power2.in",
    });

    // 🎯 Анимация контейнера: альфа + масштаб
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.8,
      duration: 100,
      ease: "Power2.in",
      onComplete: () => {
        this.destroy();
        EventBus.emit(UIEvents.MODAL_CLOSED);
      },
    });
  }

  // 🎯 Очистка памяти
  public destroy(): void {
    this.bg.destroy();
    this.container.destroy();
  }
}
