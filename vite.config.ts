import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Relative base so the demo works from GitHub Pages (/edu-typing/) and from any subfolder.
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"]
  }
})
