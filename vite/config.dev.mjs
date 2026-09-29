import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
  server: {
    port: 8080,
    hmr: {
      // 🎯 Заставляем WebSocket подключаться напрямую к Vite-серверу,
      // игнорируя порт прокси-сервера Яндекса
      port: 8080,
      host: "localhost",
      protocol: "ws",
    },
  },
});
