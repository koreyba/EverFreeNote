import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(js|jsx|ts|tsx)", "../ui/web/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-links"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: { autodocs: "tag" },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // More specific aliases first
      "@/components": path.resolve(__dirname, "../ui/web/components"),
      "@/supabase": path.resolve(__dirname, "../supabase"),
      "@/types": path.resolve(__dirname, "../core/types"),
      "@core": path.resolve(__dirname, "../core"),
      "@ui/web": path.resolve(__dirname, "../ui/web"),
      "@ui/mobile": path.resolve(__dirname, "../ui/mobile"),
      // Generic alias last
      "@": path.resolve(__dirname, ".."),
    };
    
    // Polyfill process.env for Next.js components
    config.define = {
      ...config.define,
      "process.env": {},
    };
    
    return config;
  },
};
export default config;
