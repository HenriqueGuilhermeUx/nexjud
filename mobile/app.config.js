// Distinct installable app IDs for local/test builds; production app.json is unchanged.
// Expo passes the normalized app.json to this dynamic configuration.
module.exports = ({ config }) => {
  const mode = process.env.EXPO_PUBLIC_NEXJUD_ENV || "production";
  if (!["production", "preview", "development"].includes(mode)) {
    throw new Error("NexJud Expo: invalid build environment");
  }
  if (mode === "production") return config;
  const suffix = mode === "preview" ? ".preview" : ".dev";
  return {
    ...config,
    name: mode === "preview" ? "NexJud Homologação" : "NexJud Dev",
    scheme: mode === "preview" ? "nexjud-preview" : "nexjud-dev",
    android: {
      ...config.android,
      package: config.android.package + suffix,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios.bundleIdentifier + suffix,
    },
  };
};
