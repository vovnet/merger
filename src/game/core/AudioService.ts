import * as Phaser from "phaser";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

export class AudioService {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    EventBus.on(GameEvents.GRID_ITEM_MERGED, () => this.playMergeSound());
  }

  /**
   * Воспроизводит звук слияния с небольшой вариативностью
   */
  public playMergeSound(): void {
    // Случайная скорость воспроизведения (0.9 - 1.1)
    // Это меняет высоту звука, делая каждое слияние уникальным
    const randomRate = Phaser.Math.FloatBetween(0.9, 1.1);

    this.scene.sound.play("merge_pop", {
      volume: 0.4,
      rate: randomRate,
    });
  }

  public playUnlockSquish(): void {
    this.scene.sound.play("unlock", {
      volume: 0.4,
    });
  }

  /**
   * Воспроизводит звук ошибки (невалидное слияние) - опционально
   */
  public playErrorSound(): void {
    this.scene.sound.play("error", {
      volume: 0.3,
      rate: 0.8, // Более низкий тон
    });
  }
}
