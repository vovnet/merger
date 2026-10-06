import * as Phaser from "phaser";
import { t } from "../../locales";
import { ygProvider } from "../../YGProvider";

export interface ShopProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceValue: string;
  priceCurrencyCode: string;
}

export class ShopScene extends Phaser.Scene {
  private productsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "ShopScene" });
  }

  async create() {
    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // 1. 🎯 ОДНОРОДНЫЙ ФОН (без просветов)
    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x151520, 1).setOrigin(0).setDepth(100);

    // 2. Заголовок магазина
    this.add
      .bitmapText(screenWidth / 2, 60, "russo", t("SHOP_TITLE") || "МАГАЗИН", 56)
      .setOrigin(0.5)
      .setTint(0xffd700)
      .setDepth(102);

    // 3. Кнопка закрытия
    this.add
      .sprite(screenWidth - 60, 60, "ui", "close_btn")
      .setScale(0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(102)
      .on("pointerdown", () => this.closeShop());

    // 4. Контейнер для товаров
    this.productsContainer = this.add.container(0, 0).setDepth(101);

    // 5. Загружаем и отображаем товары
    await this.renderProducts();
  }

  // 🎯 Отрисовка товаров в ОДНУ ЛИНИЮ по центру
  private async renderProducts(): Promise<void> {
    let products = await ygProvider.getCatalog();
    if (!products || products.length === 0) return;

    // 🎯 ФИЛЬТРАЦИЯ: Если реклама уже отключена, убираем этот товар из списка
    if (ygProvider.isEnabledAds === false) {
      products = products.filter((product) => product.id !== "ads_block");
    }

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // 🎯 ДИНАМИЧЕСКОЕ КОЛИЧЕСТВО КОЛОНОК:
    // Если товаров 4, будет 4 колонки. Если отфильтровали до 3, будет 3 колонки.
    const cols = products.length;
    const cardWidth = 280;
    const cardHeight = 460;
    const gapX = 20;

    const totalGridWidth = cols * cardWidth + (cols - 1) * gapX;

    // 🎯 ЗАЩИТА ОТ ПЕРЕПОЛНЕНИЯ: если экран узкий (мобильный), масштабируем всю линию
    let globalScale = 1;
    if (totalGridWidth > screenWidth - 40) {
      globalScale = (screenWidth - 40) / totalGridWidth;
    }

    // 🎯 Идеальное центрирование по X и Y
    const startX = (screenWidth - totalGridWidth) / 2 + cardWidth / 2;
    const startY = screenHeight / 2; // Строго по центру экрана по вертикали

    products.forEach((product, index) => {
      const x = startX + index * (cardWidth + gapX);
      const y = startY;

      this.createProductCard(x, y, cardWidth, cardHeight, product, globalScale);
    });
  }

  // 🎯 Создание карточки товара
  private createProductCard(
    x: number,
    y: number,
    width: number,
    height: number,
    product: ShopProduct,
    globalScale: number,
  ): void {
    const card = this.add.container(x, y);

    // 1. Фон карточки
    const bg = this.add
      .rectangle(0, 0, width, height, 0x2a2a3e)
      .setStrokeStyle(3, 0xffd700)
      .setOrigin(0.5);

    // 2. Изображение товара
    const imageKey = this.getImageKeyForProduct(product.id);
    const image = this.add.sprite(0, -110, "shop", imageKey).setOrigin(0.5).setScale(0.65);

    // 3. Заголовок
    const title = this.add
      .bitmapText(0, 30, "russo", product.title.toUpperCase(), 22)
      .setOrigin(0.5)
      .setMaxWidth(220)
      .setCenterAlign()
      .setTint(0xffd700);

    // 4. Описание
    const desc = this.add
      .bitmapText(0, 90, "russo", product.description || "", 18)
      .setOrigin(0.5)
      .setMaxWidth(230)
      .setCenterAlign();

    // 5. Кнопка покупки
    const btnY = 176;
    const buyBtn = this.add
      .sprite(0, btnY, "shop", "buy_btn")
      .setOrigin(0.5)
      .setScale(0.9)
      .setInteractive({ useHandCursor: true });

    const priceText = this.add
      .bitmapText(0, btnY - 4, "russo", `${product.price}`, 26)
      .setOrigin(0.5)
      .setTint(0xffd700);

    // 🎯 Hover-эффекты
    buyBtn.on("pointerover", () => {
      buyBtn.setScale(0.95);
      buyBtn.setTint(0xffed4e);
    });
    buyBtn.on("pointerout", () => {
      buyBtn.setScale(0.9);
      buyBtn.clearTint();
    });

    // 🎯 Обработчик покупки
    buyBtn.on("pointerdown", async () => {
      buyBtn.disableInteractive();
      buyBtn.setTint(0x888888);

      try {
        await ygProvider.purchase(product.id);
        this.closeShop();
      } catch (error) {
        console.error("❌ Ошибка покупки:", error);
      } finally {
        buyBtn.setInteractive({ useHandCursor: true });
        buyBtn.clearTint();
      }
    });

    card.add([bg, image, title, desc, buyBtn, priceText]);

    // 🎯 Применяем масштабирование ко всей карточке, если экран узкий
    card.setScale(globalScale);

    this.productsContainer.add(card);
  }

  // 🎯 Хелпер для маппинга ID на ключ спрайта
  private getImageKeyForProduct(id: string): string {
    switch (id) {
      case "ads_block":
        return "shop_ads";
      case "coins_1":
        return "shop_pack_1";
      case "coins_2":
        return "shop_pack_2";
      case "coins_3":
        return "shop_pack_3";
      default:
        return "shop_pack_1";
    }
  }

  // 🎯 Закрытие магазина
  private closeShop(): void {
    this.scene.resume("GameScene");
    this.scene.resume("UIScene");

    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
    });
  }
}
