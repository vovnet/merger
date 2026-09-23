import * as Phaser from "phaser";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

interface TapState {
  progress: number; // 0..1
  lastTapTime: number;
  resetTimer?: Phaser.Time.TimerEvent;
  drainTween?: Phaser.Tweens.Tween;
  overlay: Phaser.GameObjects.Image;
  frameW: number; // исходные размеры кадра (для crop)
  frameH: number;
}

export class TapDestroyController {
  private states = new Map<string, TapState>();

  private readonly REQUIRED_TAPS = 8;
  private readonly RESET_DELAY = 900;
  private readonly TAP_DEBOUNCE = 90;
  private readonly TAP_MOVE_THRESHOLD = 12;

  constructor(private scene: Phaser.Scene) {}

  // 🎯 Вешается на каждый контейнер айтема при создании
  public attach(container: Phaser.GameObjects.Container, itemId: string): void {
    container.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      // 🎯 Считаем, насколько сместился палец/курсор между нажатием и отпусканием
      const moved = Phaser.Math.Distance.Between(
        pointer.downX,
        pointer.downY,
        pointer.x, // на pointerup это точка отпускания
        pointer.y,
      );

      // Если было движение — это drag (мердж), не считаем тапом
      if (moved > this.TAP_MOVE_THRESHOLD) return;

      this.handleTap(container, itemId);
    });
  }

  // 🎯 Вызывать при удалении спрайта (мердж, undo, очистка)
  public detach(itemId: string): void {
    const state = this.states.get(itemId);
    if (!state) return;
    state.resetTimer?.destroy();
    state.drainTween?.stop();
    this.states.delete(itemId);
  }

  private handleTap(container: Phaser.GameObjects.Container, itemId: string): void {
    const now = this.scene.time.now;
    let state = this.states.get(itemId);
    if (!state) state = this.createState(container, itemId);
    if (!state) return;

    // Дебаунс: слишком частые тапы не считаются
    if (now - state.lastTapTime < this.TAP_DEBOUNCE) return;
    state.lastTapTime = now;

    // Останавливаем "слив" прогресса, если он шёл
    state.drainTween?.stop();

    // Прогресс + визуал + сочность
    state.progress = Math.min(1, state.progress + 1 / this.REQUIRED_TAPS);
    this.updateFill(state);
    this.punch(container);

    // Таймер сброса: перестал кликать → прогресс сливается
    state.resetTimer?.destroy();
    state.resetTimer = this.scene.time.delayedCall(this.RESET_DELAY, () => {
      this.drainProgress(container, itemId);
    });

    // 🎯 ДОСТИГНУТО МАКСИМУМ → уничтожаем
    if (state.progress >= 1) {
      this.complete(container, itemId);
    }
  }

  private createState(container: Phaser.GameObjects.Container, itemId: string): TapState | null {
    const mainSprite = container.getData("mainSprite") as Phaser.GameObjects.Image;
    if (!mainSprite) return null;

    // Красная копия сквиша поверх оригинала
    const overlay = this.scene.add.image(0, 0, mainSprite.texture.key, mainSprite.frame.name);
    overlay.setTint(0xff2222);
    overlay.setAlpha(0.8);
    overlay.setScale(mainSprite.scaleX, mainSprite.scaleY);

    const frameW = overlay.frame.cutWidth;
    const frameH = overlay.frame.cutHeight;
    overlay.setCrop(0, 0, frameW, 0); // изначально скрыт

    container.add(overlay); // добавлен после mainSprite → поверх

    const state: TapState = { progress: 0, lastTapTime: 0, overlay, frameW, frameH };
    this.states.set(itemId, state);
    return state;
  }

  // 🎯 Заливка снизу вверх через crop красной копии
  private updateFill(state: TapState): void {
    const h = Math.round(state.frameH * state.progress);
    state.overlay.setCrop(0, state.frameH - h, state.frameW, h);
  }

  // Плавный "слив" прогресса при простое
  private drainProgress(container: Phaser.GameObjects.Container, itemId: string): void {
    const state = this.states.get(itemId);
    if (!state || state.progress === 0) return;

    const proxy = { p: state.progress };
    state.drainTween = this.scene.tweens.add({
      targets: proxy,
      p: 0,
      duration: 150,
      ease: "Power2.out",
      onUpdate: () => {
        state.progress = proxy.p;
        this.updateFill(state);
      },
      onComplete: () => {
        // Полностью сбросили — удаляем оверлей и состояние
        state.overlay.destroy();
        this.states.delete(itemId);
      },
    });
  }

  // Сочный "удар": контейнер дёргается
  private punch(container: Phaser.GameObjects.Container): void {
    this.scene.tweens.add({
      targets: container,
      scale: 1.12,
      duration: 60,
      yoyo: true,
      ease: "Power2.out",
      onComplete: () => container.setScale(1),
    });
  }

  private complete(container: Phaser.GameObjects.Container, itemId: string): void {
    const state = this.states.get(itemId);
    state?.resetTimer?.destroy();
    this.states.delete(itemId);

    // 🎯 Сообщаем игре: модель удалит айтем сама
    EventBus.emit(GameEvents.ITEM_TAP_DESTROYED, {
      itemId,
      position: container.getData("gridPos"),
      level: container.getData("level"),
    });
  }
}
