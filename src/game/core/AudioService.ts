import * as Phaser from "phaser";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

export interface AudioSettings {
  muted: boolean;
  volume: number;
}

export class AudioService {
  private readonly scene: Phaser.Scene;

  private muted: boolean;
  private volume: number;

  constructor(scene: Phaser.Scene, settings?: Partial<AudioSettings>) {
    this.scene = scene;

    this.muted = settings?.muted ?? false;
    this.volume = settings?.volume ?? 1;

    this.applySettings();

    EventBus.on(GameEvents.GRID_ITEM_MERGED, () => this.playMergeSound());
  }

  // ============================================================
  // SETTINGS
  // ============================================================

  public setMuted(muted: boolean): void {
    if (this.muted === muted) {
      return;
    }

    this.muted = muted;

    this.applySettings();

    this.emitSettingsChanged();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);

    return this.muted;
  }

  public setVolume(volume: number): void {
    this.volume = Phaser.Math.Clamp(volume, 0, 1);

    this.applySettings();

    this.emitSettingsChanged();
  }

  public getVolume(): number {
    return this.volume;
  }

  public getSettings(): AudioSettings {
    return {
      muted: this.muted,
      volume: this.volume,
    };
  }

  public setSettings(settings: AudioSettings): void {
    this.muted = settings.muted;
    this.volume = Phaser.Math.Clamp(settings.volume, 0, 1);

    this.applySettings();
  }

  // ============================================================
  // SOUNDS
  // ============================================================

  public playMergeSound(): void {
    const randomRate = Phaser.Math.FloatBetween(0.9, 1.1);

    this.play("merge_pop", {
      volume: 0.4,
      rate: randomRate,
    });
  }

  public playUnlockSquish(): void {
    this.play("unlock", {
      volume: 0.4,
    });
  }

  public playSword(): void {
    this.play("sword", {
      volume: 0.6,
    });
  }

  public playErrorSound(): void {
    this.play("error", {
      volume: 0.3,
      rate: 0.8,
    });
  }

  public playWaterBubblingSound(): void {
    this.play("water_bubbling", {
      volume: 0.3,
      rate: 0.8,
    });
  }

  public playUiPopSound(): void {
    this.play("ui_pop", {
      volume: 0.3,
      rate: 0.8,
    });
  }

  public playTickSound(): void {
    this.play("tick", {
      volume: 0.8,
      rate: 0.8,
    });
  }

  public playTearingSound(): void {
    this.play("tearing", {
      volume: 0.8,
      rate: 0.8,
    });
  }

  public playNotificationSound_1(): void {
    this.play("notification_1", {
      volume: 0.8,
      rate: 0.8,
    });
  }

  public playNotificationSound_2(): void {
    this.play("notification_2", {
      volume: 0.8,
      rate: 0.8,
    });
  }
  public playShineSound(): void {
    this.play("shine", {
      volume: 0.6,
      rate: 0.8,
    });
  }

  // ============================================================
  // INTERNAL
  // ============================================================

  private play(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    this.scene.sound.play(key, {
      ...config,
      volume: (config?.volume ?? 1) * this.volume,
    });
  }

  private applySettings(): void {
    this.scene.sound.setMute(this.muted);
    this.scene.sound.setVolume(this.volume);
  }

  private emitSettingsChanged(): void {
    EventBus.emit(GameEvents.AUDIO_SETTINGS_CHANGED, this.getSettings());
  }
}
