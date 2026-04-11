import type { StorybookConfig } from "@storybook/react-vite"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config: StorybookConfig = {
  stories: [
    "../ui/web/components/**/*.stories.@(ts|tsx)",
  ],
  framework: "@storybook/react-vite",
  addons: [],
  viteFinal: async (config) => {
    // Use the project's TypeScript path aliases
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/components": path.resolve(__dirname, "../ui/web/components"),
      "@ui/web": path.resolve(__dirname, "../ui/web"),
      "@core": path.resolve(__dirname, "../core"),
    }
    return config
  },
}

export default config
