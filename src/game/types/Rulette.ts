export interface RoulettePrize {
  id: string; // Уникальный ID (например, "squish_5")
  level: number; // Уровень сквиша
  rarity: "common" | "rare" | "epic" | "legendary"; // Редкость для визуала
  frameName: string; // Имя кадра в атласе
}

export interface RouletteResult {
  prize: RoulettePrize;
  positionIndex: number; // На какой позиции ленты остановится (для анимации)
}
