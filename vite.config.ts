import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // "./" é necessário para o electron carregar dist/index.html via file://
  base: "./",
  plugins: [react(), tailwindcss()],
});