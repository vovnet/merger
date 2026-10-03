import { GameEvents } from "../../types/GameEvents";
import { TutorialStage } from "../../types/Tutorial";
import { GameState } from "../GameState";

export function createTutorialStages(gameState: GameState): TutorialStage[] {
  return [
    {
      id: "first_merge",
      trigger: () => gameState.totalMerges === 0,
      steps: [
        {
          id: "merge_intro",
          text: "Добро пожаловать! Давай научимся добавлять сквишей на поле.",
          highlightArea: { x: 100, y: 200, width: 400, height: 400 },
          waitForEvent: GameEvents.GRID_ITEM_ADDED,
        },
        {
          id: "merge_action",
          text: "Перетащи одного сквиша на такого же, чтобы они объединились!",
          highlightArea: { x: 100, y: 200, width: 400, height: 400 },
          waitForEvent: GameEvents.GRID_ITEM_MERGED,
        },
        {
          id: "merge_congrats",
          text: "Отлично! Теперь у тебя сквиш нового уровня!",
          waitForClick: true,
        },
      ],
    },
    {
      id: "first_roulette",
      trigger: () => gameState.level >= 6,
      steps: [
        {
          id: "roulette_intro",
          text: "Ты достиг 3 уровня! Открывается Сквиш-Вертушка!",
          waitForClick: true,
        },
        {
          id: "roulette_action",
          text: "Нажми на кнопку, чтобы крутить рулетку и получать награды.",
          highlightArea: { x: 540, y: 620, width: 200, height: 80 },
          waitForEvent: GameEvents.ROULETTE_OPENED,
        },
      ],
    },
  ];
}
