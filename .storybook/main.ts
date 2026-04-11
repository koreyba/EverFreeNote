import type { StorybookConfig } from "@storybook/react-vite"
import path from "path"

const config: StorybookConfig = {
  stories: [
    "../ui/web/components/**/*.stories.@(ts|tsx)",
  ],
  framework: "@storybook/react-vite",
  addons: ["@storybook/addon-essentials"],
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
