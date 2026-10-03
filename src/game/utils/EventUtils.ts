import { EventBus } from "../core/EventBus"; // Укажите правильный путь к вашему EventBus

/**
 * Подписывается на событие и выполняет колбэк ТОЛЬКО ОДИН РАЗ,
 * когда условие (condition) становится истинным.
 * После выполнения автоматически отписывается.
 *
 * @returns Функция для ручной отписки (на случай, если условие так и не выполнится)
 */
export function onceWhen(
  event: string | symbol,
  condition: () => boolean,
  callback: (...args: any[]) => void,
  context?: any,
): () => void {
  const wrapper = (...args: any[]) => {
    if (condition()) {
      // Условие выполнено! Вызываем колбэк с правильным контекстом и аргументами
      callback.apply(context, args);
      // И сразу отписываемся, чтобы не сработать повторно
      EventBus.off(event, wrapper);
    }
  };

  EventBus.on(event, wrapper);

  // Возвращаем функцию очистки на случай, если сцена уничтожится до выполнения условия
  return () => EventBus.off(event, wrapper);
}

/**
 * Подписывается на событие и выполняет колбэк КАЖДЫЙ РАЗ,
 * когда событие происходит И условие (condition) истинно.
 */
export function onWhen(
  event: string | symbol,
  condition: () => boolean,
  callback: (...args: any[]) => void,
  context?: any,
): () => void {
  const wrapper = (...args: any[]) => {
    if (condition()) {
      callback.apply(context, args);
    }
  };

  EventBus.on(event, wrapper);

  return () => EventBus.off(event, wrapper);
}
