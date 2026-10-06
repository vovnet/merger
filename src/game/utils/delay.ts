export const delay = (timeout = 4000) =>
  new Promise((resolve, _) => setTimeout(() => resolve(true), timeout));
