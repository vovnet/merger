import * as Phaser from "phaser";

export const IDLE_ANIMATIONS = [
  // 1. Классическое парение (вверх-вниз)
  (scale: number) => ({
    y: -4,
    duration: 500 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 2. Легкое покачивание (поворот влево-вправо)
  () => ({
    angle: 5, // 5 градусов в каждую сторону
    duration: 1000 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 3. "Дыхание" (легкое пульсирование масштаба)
  (scale: number) => ({
    scale: scale * 1.05, // Увеличиваем на 5% от целевого размера
    duration: 800 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 4. Комбинированная: парение + микро-поворот
  (scale: number) => ({
    y: -3,
    angle: 3,
    duration: 1200 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 🎯 НОВОЕ: 5. Горизонтальное сплющивание/растягивание (как желе, которое сжимают сбоку)
  (scale: number) => ({
    scaleX: scale * 1.15, // Растягиваем по ширине на 15%
    scaleY: scale * 0.85, // Сжимаем по высоте на 15% (компенсация объема)
    duration: 600 + Phaser.Math.Between(0, 400),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 🎯 НОВОЕ: 6. Вертикальное сплющивание/растягивание (как будто предмет подпрыгивает)
  (scale: number) => ({
    scaleX: scale * 0.85, // Сжимаем по ширине
    scaleY: scale * 1.15, // Растягиваем по высоте
    duration: 400 + Phaser.Math.Between(0, 400),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 🎯 НОВОЕ: 7. Мягкое желеобразное колебание (комбо: парение + сплющивание)
  (scale: number) => ({
    y: -3,
    scaleX: scale * 1.1,
    scaleY: scale * 0.9,
    duration: 800 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),
];
