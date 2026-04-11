import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
  stories: [
    "../ui/web/**/*.stories.@(js|jsx|ts|tsx)",
    "../components/**/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: ["@storybook/addon-links"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          "@": path.resolve(__dirname, ".."),
          "@/components": path.resolve(__dirname, "../ui/web/components"),
          "@/supabase": path.resolve(__dirname, "../supabase"),
          "@/types": path.resolve(__dirname, "../core/types"),
          "@core": path.resolve(__dirname, "../core"),
          "@ui/web": path.resolve(__dirname, "../ui/web"),
          "@ui/mobile": path.resolve(__dirname, "../ui/mobile"),
        },
      },
    });
  },
};

export default config;
