import * as Phaser from "phaser";

export interface SwitchFrame {
  /**
   * Ключ текстуры, который был зарегистрирован через
   * this.load.image(), this.load.spritesheet() или this.load.atlas()
   */
  texture: string;

  /**
   * Frame внутри texture.
   *
   * Для spritesheet:
   *   frame: 0
   *   frame: 1
   *
   * Для atlas:
   *   frame: 'switch_on'
   *   frame: 'switch_off'
   *
   * Для обычного image можно не указывать.
   */
  frame?: string | number;
}

export interface SwitchConfig {
  scene: Phaser.Scene;

  x: number;
  y: number;

  /**
   * Визуальное состояние ON
   */
  on: SwitchFrame;

  /**
   * Визуальное состояние OFF
   */
  off: SwitchFrame;

  /**
   * Начальное значение
   */
  value?: boolean;

  /**
   * Базовый scale
   */
  scale?: number;

  /**
   * Depth
   */
  depth?: number;

  /**
   * Можно ли взаимодействовать с switch
   */
  enabled?: boolean;

  /**
   * Показывать cursor: pointer
   */
  useHandCursor?: boolean;

  /**
   * Scale при нажатии.
   *
   * 0.9 означает уменьшение до 90%.
   */
  pressScale?: number;

  /**
   * Длительность анимации нажатия.
   */
  pressDuration?: number;

  /**
   * Вызывается при клике.
   *
   * Получает новое значение.
   */
  onClick?: (value: boolean) => void;

  /**
   * Вызывается при изменении значения.
   *
   * Вызывается также при setValue().
   */
  onChange?: (value: boolean) => void;
}

export class Switch {
  private readonly scene: Phaser.Scene;

  private readonly onSprite: Phaser.GameObjects.Image;
  private readonly offSprite: Phaser.GameObjects.Image;

  private value: boolean;

  private baseScale: number;
  private depth: number;

  private enabled: boolean;

  private readonly useHandCursor: boolean;

  private readonly pressScale: number;
  private readonly pressDuration: number;

  private readonly onClick?: (value: boolean) => void;
  private readonly onChange?: (value: boolean) => void;

  private destroyed = false;

  constructor(config: SwitchConfig) {
    this.scene = config.scene;

    this.value = config.value ?? false;

    this.baseScale = config.scale ?? 1;
    this.depth = config.depth ?? 0;

    this.enabled = config.enabled ?? true;

    this.useHandCursor = config.useHandCursor ?? true;

    this.pressScale = config.pressScale ?? 0.9;
    this.pressDuration = config.pressDuration ?? 80;

    this.onClick = config.onClick;
    this.onChange = config.onChange;

    // ----------------------------------------
    // ON
    // ----------------------------------------

    this.onSprite = this.scene.add.image(config.x, config.y, config.on.texture, config.on.frame);

    // ----------------------------------------
    // OFF
    // ----------------------------------------

    this.offSprite = this.scene.add.image(config.x, config.y, config.off.texture, config.off.frame);

    // ----------------------------------------
    // Общие настройки
    // ----------------------------------------

    this.onSprite.setScale(this.baseScale);
    this.offSprite.setScale(this.baseScale);

    this.onSprite.setDepth(this.depth);
    this.offSprite.setDepth(this.depth);

    // ----------------------------------------
    // Input
    // ----------------------------------------

    this.setupInput();

    // ----------------------------------------
    // Начальное состояние
    // ----------------------------------------

    this.updateVisual();
  }

  // ============================================================
  // INPUT
  // ============================================================

  private setupInput(): void {
    this.onSprite.setInteractive({
      useHandCursor: this.useHandCursor,
    });

    this.offSprite.setInteractive({
      useHandCursor: this.useHandCursor,
    });

    this.onSprite.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);

    this.offSprite.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.destroyed) {
      return;
    }

    pointer.event.stopPropagation();

    // Меняем значение
    this.value = !this.value;

    // Меняем картинку
    this.updateVisual();

    // Анимация нажатия
    this.animatePress();

    // Событие клика
    this.onClick?.(this.value);

    // Событие изменения
    this.onChange?.(this.value);
  }

  // ============================================================
  // VISUAL
  // ============================================================

  private updateVisual(): void {
    if (this.destroyed) {
      return;
    }

    if (this.value) {
      this.onSprite.setVisible(true);
      this.offSprite.setVisible(false);

      this.onSprite.input!.enabled = this.enabled;
      this.offSprite.input!.enabled = false;
    } else {
      this.onSprite.setVisible(false);
      this.offSprite.setVisible(true);

      this.onSprite.input!.enabled = false;
      this.offSprite.input!.enabled = this.enabled;
    }
  }

  // ============================================================
  // PRESS ANIMATION
  // ============================================================

  private animatePress(): void {
    const sprite = this.value ? this.onSprite : this.offSprite;

    this.scene.tweens.killTweensOf(sprite);

    sprite.setScale(this.baseScale);

    this.scene.tweens.add({
      targets: sprite,

      scaleX: this.baseScale * this.pressScale,
      scaleY: this.baseScale * this.pressScale,

      duration: this.pressDuration,

      ease: "Quad.easeOut",

      yoyo: true,
    });
  }

  // ============================================================
  // VALUE
  // ============================================================

  public getValue(): boolean {
    return this.value;
  }

  public setValue(value: boolean): this {
    if (this.value === value) {
      return this;
    }

    this.value = value;

    this.updateVisual();

    this.onChange?.(this.value);

    return this;
  }

  public toggle(): this {
    this.setValue(!this.value);

    return this;
  }

  // ============================================================
  // ENABLE
  // ============================================================

  public setEnabled(enabled: boolean): this {
    if (this.destroyed) {
      return this;
    }

    this.enabled = enabled;

    this.updateVisual();

    return this;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // ============================================================
  // POSITION
  // ============================================================

  public setPosition(x: number, y: number): this {
    this.onSprite.setPosition(x, y);
    this.offSprite.setPosition(x, y);

    return this;
  }

  public setX(x: number): this {
    this.onSprite.setX(x);
    this.offSprite.setX(x);

    return this;
  }

  public setY(y: number): this {
    this.onSprite.setY(y);
    this.offSprite.setY(y);

    return this;
  }

  public getX(): number {
    return this.onSprite.x;
  }

  public getY(): number {
    return this.onSprite.y;
  }

  // ============================================================
  // SCALE
  // ============================================================

  public setScale(scale: number): this {
    this.baseScale = scale;

    this.onSprite.setScale(scale);
    this.offSprite.setScale(scale);

    return this;
  }

  public getScale(): number {
    return this.baseScale;
  }

  // ============================================================
  // DEPTH
  // ============================================================

  public setDepth(depth: number): this {
    this.depth = depth;

    this.onSprite.setDepth(depth);
    this.offSprite.setDepth(depth);

    return this;
  }

  public getDepth(): number {
    return this.depth;
  }

  // ============================================================
  // VISIBLE
  // ============================================================

  public setVisible(visible: boolean): this {
    if (this.destroyed) {
      return this;
    }

    if (visible) {
      this.updateVisual();
    } else {
      this.onSprite.setVisible(false);
      this.offSprite.setVisible(false);

      this.onSprite.input!.enabled = false;
      this.offSprite.input!.enabled = false;
    }

    return this;
  }

  // ============================================================
  // DESTROY
  // ============================================================

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    this.scene.tweens.killTweensOf(this.onSprite);
    this.scene.tweens.killTweensOf(this.offSprite);

    this.onSprite.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);

    this.offSprite.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);

    this.onSprite.destroy();
    this.offSprite.destroy();
  }
}
