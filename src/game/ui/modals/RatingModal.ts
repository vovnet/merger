import * as Phaser from "phaser";
import { BaseModal } from "./BaseModal";
import { GameState } from "../../core/GameState";
import { t } from "../../../locales";
import { ygProvider } from "../../../YGProvider";

export class RatingModal extends BaseModal {
  private readonly REWARD_AMOUNT = 50;

  protected buildUI(): void {
    const centerX = 0;
    const centerY = 0;

    // 🎨 1. Фон модалки (красивая рамка)
    const modalBg = this.scene.add
      .rectangle(centerX, centerY, 520, 420, 0x2a2a3e)
      .setStrokeStyle(4, 0xffd700)
      .setOrigin(0.5);

    // 3. Заголовок
    const title = this.scene.add
      .bitmapText(centerX, centerY - 140, "russo", t("RATING_TITLE"), 24)
      .setOrigin(0.5)
      .setTint(0xffd700);

    // 4. Иконка награды (монеты)
    const rewardIcon = this.scene.add.sprite(0, 0, "squish-pack", "coin_pack_3").setScale(0.3);
    rewardIcon.enableFilters();
    rewardIcon.filters?.external.addGlow(0xeb57ff, 2, 1, 1, false, 10, 24);

    // 5. Текст количества награды
    const rewardText = this.scene.add
      .bitmapText(0, 40, "russo", `x${this.REWARD_AMOUNT}`, 64)
      .setOrigin(0, 0.5)
      .setTint(0xffd700);

    this.scene.add.container(centerX - 60, centerY - 40, [rewardIcon, rewardText]).setScale(1);

    // 6. Анимация "пульсации" для иконки (привлекает внимание)
    this.scene.tweens.add({
      targets: [rewardIcon, rewardText], // Анимируем оба объекта одновременно
      scale: "+=0.1", // Увеличить текущий масштаб на 0.1 (иконка станет 0.55, текст 1.1)
      duration: 800,
      yoyo: true, // Вернуть обратно
      repeat: -1, // Бесконечно
      ease: "Sine.easeInOut",
    });

    // 8. Кнопка закрытия (крестик)
    const closeBtn = this.scene.add
      .sprite(centerX + 250, centerY - 200, "ui", "close_btn")
      .setScale(0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.close());

    // Добавляем всё в контейнер
    this.container.add([modalBg, title, rewardIcon, rewardText, closeBtn]);
    // 7. Проверяем, можно ли запросить оценку
    this.renderRateButton(centerX, centerY);
  }

  // 🎯 Кнопка "Оценить" (когда можно оставить отзыв)
  private renderRateButton(centerX: number, centerY: number): void {
    const btnBg = this.scene.add
      .rectangle(centerX, centerY + 150, 300, 60, 0xffd700)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const btnText = this.scene.add
      .bitmapText(centerX, centerY + 148, "russo", t("RATING_BUTTON"), 24)
      .setOrigin(0.5)
      .setTint(0x9c3f1a);

    btnBg.on("pointerover", () => btnBg.setFillStyle(0xffed4e));
    btnBg.on("pointerout", () => btnBg.setFillStyle(0xffd700));

    btnBg.on("pointerdown", async () => {
      // Блокируем кнопку, чтобы избежать двойных кликов
      btnBg.disableInteractive();
      btnBg.setFillStyle(0xccaa00);

      try {
        const reviewResult = await ygProvider.requestReview();
        // const reviewResult = { feedbackSent: true };

        if (reviewResult?.feedbackSent) {
          // ✅ Игрок оставил отзыв! Начисляем награду
          const gameState = this.scene.registry.get("gameState") as GameState;
          gameState.addCoins(this.REWARD_AMOUNT);

          // Показываем красивую анимацию "Спасибо!"
          this.showThankYouAnimation(centerX, centerY);
        } else {
          // ⚠️ Игрок закрыл окно без отзыва
          console.log("Игрок закрыл окно оценки");
          btnBg.setInteractive({ useHandCursor: true });
          btnBg.setFillStyle(0xffd700);
        }
      } catch (error) {
        console.error("❌ Ошибка при запросе оценки:", error);
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.setFillStyle(0xffd700);
      }
    });

    this.container.add([btnBg, btnText]);
  }

  // 🎯 Красивая анимация "Спасибо!" после успешной оценки
  private showThankYouAnimation(centerX: number, centerY: number): void {
    // Создаем большой текст "СПАСИБО!"
    const thankYou = this.scene.add
      .bitmapText(centerX, centerY, "russo", t("RATING_THANK_YOU"), 72)
      .setOrigin(0.5)
      .setTint(0xffd700)
      .setAlpha(0)
      .setScale(0.5);

    this.container.add(thankYou);

    // Анимация появления
    this.scene.tweens.add({
      targets: thankYou,
      alpha: 1,
      scale: 1.2,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        // Задерживаем на секунду и закрываем
        this.scene.time.delayedCall(1000, () => {
          if (this.isOpen) {
            this.close();
          }
        });
      },
    });

    // Добавляем конфетти/искры вокруг текста
    const emitter = this.scene.add.particles(centerX, centerY, "fireworks", {
      frame: ["star_5", "star_4"],
      speed: { min: 250, max: 600 },
      angle: { min: 0, max: 360 },
      scale: { start: 0, end: 0.8 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      quantity: 30,
      blendMode: "ADD",
      emitting: false,
    });

    this.container.add(emitter);

    emitter.explode();

    this.scene.time.delayedCall(800, () => {
      emitter.destroy();
    });
  }
}
