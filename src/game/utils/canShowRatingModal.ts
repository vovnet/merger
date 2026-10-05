const MODAL_LAST_SHOWN_KEY = "rating_modal_last_shown";
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

export const canShowRatingModal = (): boolean => {
  const lastShown = localStorage.getItem(MODAL_LAST_SHOWN_KEY);

  if (!lastShown) {
    return true;
  }

  return Date.now() - Number(lastShown) >= THREE_DAYS;
};

export const saveLastTimeOpenModal = () => {
  localStorage.setItem(MODAL_LAST_SHOWN_KEY, String(Date.now()));
};
