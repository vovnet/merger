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
          highlightArea: { x: 1020, y: 400, width: 220, height: 200 },
          waitForEvent: GameEvents.GRID_ITEM_ADDED,
        },
        {
          id: "merge_action",
          text: "Перетащи одного сквиша на такого же, чтобы они объединились!",
          highlightArea: { x: 590, y: 310, width: 200, height: 100 },
          waitForEvent: GameEvents.GRID_ITEM_MERGED,
        },
      ],
    },
    {
      id: "squish_factory",
      trigger: () => gameState.totalMerges === 6,
      steps: [
        {
          id: "create_squish",
          text: "Запустите фабрику, чтобы произвести сквиша.",
          highlightArea: { x: 1010, y: 100, width: 220, height: 240 },
          waitForEvent: GameEvents.ADDED_COIN_CLICK,
        },
      ],
    },
    {
      id: "first_roulette",
      trigger: () => gameState.level >= 6,
      steps: [
        {
          id: "roulette_intro",
          text: "У тебя появился билет для сквиш-вертушки!",
          highlightArea: { x: 800, y: 6, width: 60, height: 60 },
          textPosition: { x: 820, y: 200 },
          waitForClick: true,
        },
        {
          id: "roulette_open",
          text: "Открой с сквиш-вертушку.",
          highlightArea: { x: 50, y: 460, width: 210, height: 120 },
          waitForEvent: GameEvents.ROULETTE_OPENED,
        },
        {
          id: "roulette_run",
          text: "Нажми на кнопку, чтобы крутить рулетку и получать награды.",
          highlightArea: { x: 540, y: 570, width: 200, height: 110 },
          textPosition: { x: 640, y: 480 },
          waitForEvent: GameEvents.ROULETTE_RUN,
        },
      ],
    },
  ];
}
