import StartGame from "./game/main";
import type { SDK } from "ysdk";
import { ygProvider } from "./YGProvider";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadYandexSDK();

    await ygProvider.init();

    console.log("✅ Yandex SDK успешно инициализирован");

    // 3. ТОЛЬКО ПОСЛЕ этого запускаем игру
    StartGame("game-container");
  } catch (error) {
    console.error("❌ Ошибка инициализации Yandex SDK:", error);
    // Fallback: запускаем игру без SDK (для локальной разработки)
    StartGame("game-container");
  }
});

// Функция загрузки SDK скрипта
function loadYandexSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/sdk.js";
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не удалось загрузить Yandex SDK"));

    document.head.appendChild(script);
  });
}
