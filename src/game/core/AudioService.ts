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

  public playSword(): void {
    this.scene.sound.play("sword", { volume: 0.6 });
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

  public playWaterBubblingSound(): void {
    this.scene.sound.play("water_bubbling", {
      volume: 0.3,
      rate: 0.8, // Более низкий тон
    });
  }

  public playUiPopSound(): void {
    this.scene.sound.play("ui_pop", {
      volume: 0.3,
      rate: 0.8, // Более низкий тон
    });
  }

  public playTickSound(): void {
    this.scene.sound.play("tick", {
      volume: 0.8,
      rate: 0.8, // Более низкий тон
    });
  }

  public playTearingSound(): void {
    this.scene.sound.play("tearing", {
      volume: 0.8,
      rate: 0.8,
    });
  }
}
