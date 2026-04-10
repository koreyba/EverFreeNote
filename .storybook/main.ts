import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: [
    "../ui/**/*.mdx",
    "../ui/**/*.stories.@(js|jsx|ts|tsx)",
  ],
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
      "@/components": path.resolve(__dirname, "../ui/web/components"),
      "@/supabase": path.resolve(__dirname, "../supabase"),
      "@/types": path.resolve(__dirname, "../core/types"),
      "@core": path.resolve(__dirname, "../core"),
      "@ui/web": path.resolve(__dirname, "../ui/web"),
      "@ui/mobile": path.resolve(__dirname, "../ui/mobile"),
      "@": path.resolve(__dirname, "../"),
    };
    // Polyfill process.env for Vite (Next.js compatibility)
    config.define = {
      ...config.define,
      "process.env": {
        NEXT_PUBLIC_SUPABASE_URL: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co"),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key"),
        NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID: JSON.stringify(process.env.NEXT_PUBLIC_LEMONSQUEEZY_STORE_ID || ""),
        NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID: JSON.stringify(process.env.NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID || ""),
        NEXT_PUBLIC_TEST_AUTH_EMAIL: JSON.stringify(process.env.NEXT_PUBLIC_TEST_AUTH_EMAIL || ""),
        NEXT_PUBLIC_TEST_AUTH_PASSWORD: JSON.stringify(process.env.NEXT_PUBLIC_TEST_AUTH_PASSWORD || ""),
        NEXT_PUBLIC_SKIP_AUTH_EMAIL: JSON.stringify(process.env.NEXT_PUBLIC_SKIP_AUTH_EMAIL || ""),
        NEXT_PUBLIC_SKIP_AUTH_PASSWORD: JSON.stringify(process.env.NEXT_PUBLIC_SKIP_AUTH_PASSWORD || ""),
      },
    };
    return config;
  },
};

export default config;
