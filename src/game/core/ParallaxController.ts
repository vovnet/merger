import * as Phaser from "phaser";

export class ParallaxController {
  private scene: Phaser.Scene;
  private target: Phaser.GameObjects.Image | Phaser.GameObjects.Container;

  private strength: number; // Сила смещения (чем меньше, тем тоньше эффект)
  private smoothSpeed: number; // Скорость сглаживания (чем меньше, тем плавнее "догоняет")

  private baseX: number = 0;
  private baseY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;

  constructor(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Image | Phaser.GameObjects.Container,
    strength: number = 0.03, // По умолчанию очень мягкий эффект
    smoothSpeed: number = 0.08, // Плавное, "тягучее" движение
  ) {
    this.scene = scene;
    this.target = target;
    this.strength = strength;
    this.smoothSpeed = smoothSpeed;

    // Запоминаем исходную ("базовую") позицию объекта
    this.baseX = target.x;
    this.baseY = target.y;
    this.currentX = this.baseX;
    this.currentY = this.baseY;
    this.targetX = this.baseX;
    this.targetY = this.baseY;

    // Слушаем движение мыши (или тача)
    this.scene.input.on("pointermove", this.onPointerMove, this);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    // Вычисляем смещение от центра.
    // Знак "минус" заставляет фон двигаться в ПРОТИВОПОЛОЖНУЮ сторону от мыши (эффект глубины)
    this.targetX = this.baseX - (pointer.x - centerX) * this.strength;
    this.targetY = this.baseY - (pointer.y - centerY) * this.strength;
  }

  // 🎯 Этот метод нужно вызывать в update() твоей сцены
  public update(): void {
    // Плавная интерполяция (Lerp) текущей позиции к целевой
    this.currentX = Phaser.Math.Linear(this.currentX, this.targetX, this.smoothSpeed);
    this.currentY = Phaser.Math.Linear(this.currentY, this.targetY, this.smoothSpeed);

    // Применяем позицию.
    // Math.round предотвращает "мыло" (размытие) текстуры из-за субпиксельного рендеринга
    this.target.x = Math.round(this.currentX);
    this.target.y = Math.round(this.currentY);
  }

  public destroy(): void {
    this.scene.input.off("pointermove", this.onPointerMove, this);
  }
}
