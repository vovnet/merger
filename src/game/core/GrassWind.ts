import * as Phaser from "phaser";

export interface GrassWindConfig {
  speed?: number;
  strength?: number;
  frequency?: number;
}

export class GrassWind extends Phaser.GameObjects.Shader {
  private windSpeed: number;
  private windStrength: number;
  private windFrequency: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    textureKey: string,
    config: GrassWindConfig = {},
  ) {
    const fragmentSource = `
      precision mediump float;

      uniform sampler2D uGrassTexture;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uStrength;
      uniform float uFrequency;
      varying vec2 outTexCoord;

      void main() {
          vec2 uv = outTexCoord;
          float height = uv.y; // 0 = низ, 1 = верх

          // Плавное нарастание силы ветра к верхушке
          float windWeight = smoothstep(0.05, 0.85, height);

          // Три наложенные волны для естественности
          float wave1 = sin(uv.x * 6.2831 * uFrequency + uTime * uSpeed);
          float wave2 = sin(uv.x * 6.2831 * (uFrequency * 1.73) - uTime * (uSpeed * 0.73) + 1.7);
          float wave3 = sin(uv.x * 6.2831 * (uFrequency * 3.1) + uTime * (uSpeed * 1.37) + 4.0);

          float wind = wave1 * 0.55 + wave2 * 0.30 + wave3 * 0.15;
          float displacement = wind * uStrength * windWeight * windWeight;

          uv.x += displacement;
          uv.x = clamp(uv.x, 0.001, 0.999);

          gl_FragColor = texture2D(uGrassTexture, uv);
      }
    `;

    const shaderConfig: Phaser.Types.GameObjects.Shader.ShaderQuadConfig = {
      name: "GrassWindShader",
      fragmentSource,
      // 🎯 УБРАЛИ setupUniforms отсюда, чтобы он не мешал ручному обновлению
    };

    super(scene, shaderConfig, x, y, width, height, [textureKey]);

    this.windSpeed = config.speed ?? 1.2;
    this.windStrength = config.strength ?? 0.018;
    this.windFrequency = config.frequency ?? 2.5;

    // Добавляем в сцену
    scene.add.existing(this);

    // 🎯 Явно привязываем текстуру к нашему юниформу (текстура из массива [textureKey] идет в слот 0)
    this.setUniform("uGrassTexture", 0);
  }

  // 🎯 Этот метод ОБЯЗАТЕЛЬНО должен вызываться каждый кадр
  public update(time: number, delta: number): void {
    // time приходит в миллисекундах, делим на 1000 для секунд
    const currentTime = time * 0.001;

    // 🎯 ЖЕСТКО обновляем все юниформы каждый кадр
    this.setUniform("uTime", currentTime);
    this.setUniform("uSpeed", this.windSpeed);
    this.setUniform("uStrength", this.windStrength);
    this.setUniform("uFrequency", this.windFrequency);

    // 🔍 РАСКОММЕНТИРУЙТЕ ЭТУ СТРОКУ ДЛЯ ПРОВЕРКИ:
    // Если в консоли браузера НЕ появляются эти сообщения, значит update не вызывается!
    // console.log("GrassWind update: time =", currentTime.toFixed(2));
  }

  public setWindSpeed(value: number): this {
    this.windSpeed = value;
    return this;
  }

  public setWindStrength(value: number): this {
    this.windStrength = value;
    return this;
  }

  public setWindFrequency(value: number): this {
    this.windFrequency = value;
    return this;
  }
}
