import type { Preview } from "storybook";
import "../app/globals.css";

const fixedNow = new Date("2025-01-01T00:00:00.000Z");

const preview: Preview = {
  globals: {
    locale: "en-US",
  },
  parameters: {
    a11y: { test: "error" },
    controls: { sort: "alpha" },
    options: { storySort: (left, right) => left[1].id.localeCompare(right[1].id) },
    wtf: {
      clock: fixedNow.toISOString(),
      locale: "en-US",
      timezone: "UTC",
      network: "local-fixtures-only",
    },
  },
  decorators: [
    (Story) => {
      if (typeof document !== "undefined") {
        document.documentElement.lang = "en-US";
        document.documentElement.dataset.fixtureClock = fixedNow.toISOString();
        document.documentElement.dataset.fixtureTimezone = "UTC";
      }
      return Story();
    },
  ],
};

export default preview;
