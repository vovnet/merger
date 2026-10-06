import * as Phaser from "phaser";

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super("PreloaderScene");
  }

  preload() {
    const { width, height } = this.scale;

    // Фон
    this.cameras.main.setBackgroundColor("#111827");

    this.add
      .image(0, 0, "boot_bg")
      .setOrigin(0, 0)
      .setDisplaySize(this.scale.width, this.scale.height);

    // Логотип
    const logo = this.add.image(width / 2, height / 2 - 100, "logo");

    // Немного уменьшаем, если логотип большой
    logo.setScale(0.5);

    // Размеры прогрессбара
    const barWidth = 400;
    const barHeight = 24;

    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 + 50;

    // Рамка прогрессбара
    const progressBox = this.add.graphics();

    progressBox.lineStyle(2, 0xffffff, 0.3);
    progressBox.strokeRoundedRect(barX, barY, barWidth, barHeight, 12);

    // Сам прогресс
    const progressBar = this.add.graphics();

    // Процент
    const percentText = this.add.text(width / 2, barY + 45, "0%", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#333138",
    });

    percentText.setOrigin(0.5);

    // Следим за загрузкой
    this.load.on("progress", (value: number) => {
      progressBar.clear();

      progressBar.fillStyle(0x4ade80, 1);

      progressBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 12);

      percentText.setText(`${Math.round(value * 100)}%`);
    });

    // Когда всё загружено
    this.load.once("complete", () => {
      this.scene.start("GameScene");
    });

    // Здесь загружаем ассеты игры
    this.load.image("bg_main", "assets/bg.png");
    this.load.atlas("squishes", "assets/spritesheet.png", "assets/spritesheet.json");
    this.load.atlas("ranks", "assets/rank_sprites.png", "assets/rank_sprites.json");
    this.load.atlas("ui", "assets/ui_spritesheet.png", "assets/ui_spritesheet.json");
    this.load.atlas("rare-squishes", "assets/rare_texture.png", "assets/rare_texture.json");
    this.load.atlas(
      "squish-pack",
      "assets/squish_pack_spritesheet.png",
      "assets/squish_pack_spritesheet.json",
    );
    this.load.atlas(
      "fireworks",
      "assets/fireworks_spritesheet.png",
      "assets/fireworks_spritesheet.json",
    );
    this.load.atlas("shop", "assets/shop_spritesheet.png", "assets/shop_spritesheet.json");
    this.load.image("grass", "assets/bush.png");

    this.load.audio("merge_pop", "assets/sound/bubble_1.mp3");
    this.load.audio("unlock", "assets/sound/unlock.mp3");
    this.load.audio("sword", "assets/sound/sword.mp3");
    this.load.audio("water_bubbling", "assets/sound/water_bubbling.mp3");
    this.load.audio("ui_pop", "assets/sound/ui_pop.mp3");
    this.load.audio("tick", "assets/sound/tick.mp3");
    this.load.audio("tearing", "assets/sound/tearing.mp3");
    this.load.audio("notification_1", "assets/sound/notification_1.mp3");
    this.load.audio("notification_2", "assets/sound/notification_2.mp3");
    this.load.audio("shine", "assets/sound/shine.mp3");

    this.load.bitmapFont("russo", "assets/fonts/days5.png", "assets/fonts/days5.xml");

    // 1. Создаем временный Graphics объект
    const graphics = this.add.graphics({ x: 0, y: 0 });
    // 2. Рисуем мягкий круг (16x16 пикселей)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(8, 8, 8);
    // 3. Генерируем текстуру из нарисованного
    graphics.generateTexture("particle_blob", 16, 16);
    // 4. Сразу удаляем сам Graphics объект!
    // (Если этого не сделать, белый круг так и останется висеть в левом верхнем углу экрана)
    graphics.destroy();
  }
}
