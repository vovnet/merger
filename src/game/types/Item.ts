// Данные предмета — только ID и уровень
export interface ItemData {
  id: string;
  level: number; // 1-7
}

// Координаты на сетке
export interface GridPosition {
  x: number; // колонка (0-3)
  y: number; // строка (0-4)
}

// Клетка поля — либо предмет, либо пусто
export type Cell = ItemData | null;

// Конфигурация сетки
export interface GridConfig {
  cols: number; // 4
  rows: number; // 5
}
