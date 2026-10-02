import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Las gráficas se importan dinámicamente; no agrupar sus dependencias con React.
export default defineConfig({
  plugins: [react()],
  build: { sourcemap: false },
});
