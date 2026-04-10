import type { Meta, StoryObj } from "@storybook/react";
import TestTargetComponent from "./TestTargetComponent";

const meta: Meta<typeof TestTargetComponent> = {
  title: "Components/TestTargetComponent",
  component: TestTargetComponent,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof TestTargetComponent>;

export const Default: Story = {};
