import * as Phaser from "phaser";
import { ItemRegistry } from "./ItemRegistry";
import { RoulettePrize } from "../types/Rulette";

export class RouletteService {
  // 🎯 Пул всех возможных призов (уровни сквишей)
  private availableLevels: number[] = [1, 2, 3, 4, 5, 6, 7];

  // 🎯 Веса редкости (чем выше уровень, тем реже)
  private getRarity(level: number): RoulettePrize["rarity"] {
    if (level <= 2) return "common";
    if (level <= 4) return "rare";
    if (level <= 6) return "epic";
    return "legendary";
  }

  /**
   * Генерирует случайный приз с учётом весов
   */
  public getRandomPrize(): RoulettePrize {
    // Простая взвешенная случайность: низкие уровни выпадают чаще
    const weights = [30, 25, 20, 12, 7, 4, 2]; // Сумма = 100
    const random = Phaser.Math.Between(1, 100);

    let cumulative = 0;
    let selectedLevel = 1;

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        selectedLevel = i + 1;
        break;
      }
    }

    return {
      id: `prize_${Date.now()}_${Phaser.Math.Between(0, 9999)}`,
      level: selectedLevel,
      rarity: this.getRarity(selectedLevel),
      frameName: ItemRegistry.getFrameName(selectedLevel),
    };
  }

  /**
   * Определяет выигрыш (в будущем здесь может быть запрос к серверу)
   */
  public determineWin(): RoulettePrize {
    //  Здесь можно добавить логику:
    // - запрос к серверу
    // - гарантированный приз за контракт
    // - ограничения по инвентарю
    return this.getRandomPrize();
  }

  /**
   * Генерирует ленту призов для анимации
   * @param winPrize - Приз, который должен выпасть
   * @param totalItems - Общее количество призов в ленте (рекомендуется 40-60)
   * @param winPosition - На какой позиции должен быть выигрыш (рекомендуется ~45)
   */
  public generateStrip(
    winPrize: RoulettePrize,
    totalItems: number = 50,
    winPosition: number = 45,
  ): RoulettePrize[] {
    const strip: RoulettePrize[] = [];

    for (let i = 0; i < totalItems; i++) {
      if (i === winPosition) {
        // 🎯 На целевой позиции ставим выигрышный приз
        strip.push(winPrize);
      } else {
        // На остальных позициях - случайные призы
        strip.push(this.getRandomPrize());
      }
    }

    return strip;
  }

  /**
   * Рассчитывает финальную позицию ленты (в пикселях)
   * @param winPosition - Индекс выигрышного приза
   * @param itemWidth - Ширина одной ячейки
   * @param itemGap - Расстояние между ячейками
   * @param viewportCenter - Центр экрана (где указатель)
   */
  public calculateFinalX(
    winPosition: number,
    itemWidth: number,
    itemGap: number,
    viewportCenter: number,
  ): number {
    const cellWidth = itemWidth + itemGap;

    //  Базовая позиция: центр выигрышного приза
    const basePosition = winPosition * cellWidth + itemWidth / 2;

    // 🎯 Добавляем небольшой рандом в пределах клетки (-30% до +30% от ширины)
    // Чтобы указатель не всегда был идеально по центру
    const randomOffset = Phaser.Math.Between(-itemWidth * 0.3, itemWidth * 0.3);

    //  Финальная позиция ленты (отрицательная, т.к. двигаем влево)
    return -(basePosition - viewportCenter + randomOffset);
  }
}
