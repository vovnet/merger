import { t } from "../../../locales";
import { GameEvents } from "../../types/GameEvents";
import { TutorialStage } from "../../types/Tutorial";
import { GameState } from "../GameState";

export function createTutorialStages(gameState: GameState) {
  return [
    {
      id: "first_merge",
      trigger: () => gameState.totalMerges === 0,
      steps: [
        {
          id: "merge_intro",
          text: t("TUTORIAL_MERGE_INTRO"), // 🎯 Используем ключ
          highlightArea: { x: 1020, y: 400, width: 220, height: 200 },
          handPointer: { type: "tap", x: 1000, y: 540 },
          waitForEvent: GameEvents.GRID_ITEM_ADDED,
        },
        {
          id: "merge_action",
          text: t("TUTORIAL_MERGE_ACTION"), // 🎯 Используем ключ
          highlightArea: { x: 590, y: 310, width: 200, height: 100 },
          handPointer: {
            type: "slide",
            startX: 560,
            startY: 440,
            endX: 740,
            endY: 440,
            x: 0,
            y: 0,
          },
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
          text: t("TUTORIAL_FACTORY_CREATE"), // 🎯 Используем ключ
          highlightArea: { x: 1010, y: 100, width: 220, height: 240 },
          handPointer: { type: "tap", x: 1050, y: 340 },
          textPosition: { x: 800, y: 480 },
          waitForEvent: GameEvents.ADDED_COIN_CLICK,
        },
      ],
    },
    {
      id: "first_roulette",
      trigger: () => gameState.level === 6,
      steps: [
        {
          id: "roulette_intro",
          text: t("TUTORIAL_ROULETTE_TICKET"), // 🎯 Используем ключ
          highlightArea: { x: 800, y: 6, width: 60, height: 60 },
          textPosition: { x: 820, y: 200 },
          waitForClick: true,
        },
        {
          id: "roulette_open",
          text: t("TUTORIAL_ROULETTE_OPEN"), // 🎯 Используем ключ
          highlightArea: { x: 50, y: 460, width: 210, height: 120 },
          handPointer: { type: "tap", x: 100, y: 600 },
          waitForEvent: GameEvents.ROULETTE_OPENED,
        },
        {
          id: "roulette_run",
          text: t("TUTORIAL_ROULETTE_SPIN"), // 🎯 Используем ключ
          highlightArea: { x: 540, y: 570, width: 200, height: 110 },
          textPosition: { x: 640, y: 480 },
          handPointer: { type: "tap", x: 500, y: 660 },
          waitForEvent: GameEvents.ROULETTE_RUN,
        },
      ],
    },
    {
      id: "first_contract",
      trigger: () => gameState.level >= 7,
      steps: [
        {
          id: "contract_intro",
          text: t("TUTORIAL_CONTRACT_INTRO"), // 🎯 Используем ключ
          highlightArea: { x: 50, y: 30, width: 200, height: 240 },
          textPosition: { x: 600, y: 200 },
          waitForClick: true,
        },
      ],
    },
    {
      id: "contract_completed",
      trigger: () => gameState.level >= 7,
      steps: [
        {
          id: "get_reward",
          text: t("TUTORIAL_CONTRACT_REWARD"), // 🎯 Используем ключ
          highlightArea: { x: 50, y: 30, width: 200, height: 240 },
          handPointer: { type: "tap", x: 150, y: 280 },
          textPosition: { x: 600, y: 200 },
          waitForEvent: GameEvents.CONTRACT_REWARD_CLAIMED,
        },
      ],
    },
  ] as TutorialStage[];
}
