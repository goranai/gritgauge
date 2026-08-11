import {
  registerPlugin, unregisterPlugin, getPlugin, listPlugins,
  getPluginsForHook, executePluginHook, installPlugin, uninstallPlugin,
  getMarketplacePlugins, searchMarketplace,
} from "../src/services/plugin/index";

describe("Plugin System", () => {
  const testManifest = {
    id: "test-plugin",
    name: "Test Plugin",
    version: "1.0.0",
    description: "A test plugin",
    author: "Tester",
    hooks: ["onTriageComplete"] as const,
    permissions: ["notifications"],
    runtime: "http" as const,
    entrypoint: "https://example.com/plugin",
  };

  beforeEach(() => {
    // Clean registry
    try { unregisterPlugin("test-plugin"); } catch {}
  });

  describe("registerPlugin", () => {
    it("registers a plugin in the registry", () => {
      registerPlugin(testManifest);
      const plugin = getPlugin("test-plugin");
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe("Test Plugin");
      expect(plugin?.hooks).toContain("onTriageComplete");
    });
  });

  describe("unregisterPlugin", () => {
    it("removes a plugin from registry", () => {
      registerPlugin(testManifest);
      unregisterPlugin("test-plugin");
      expect(getPlugin("test-plugin")).toBeNull();
    });
  });

  describe("listPlugins", () => {
    it("lists all registered plugins", () => {
      registerPlugin(testManifest);
      const plugins = listPlugins();
      expect(plugins.length).toBeGreaterThanOrEqual(1);
      expect(plugins.find((p) => p.id === "test-plugin")).toBeDefined();
    });
  });

  describe("getPluginsForHook", () => {
    it("returns plugins matching a hook", () => {
      registerPlugin(testManifest);
      const plugins = getPluginsForHook("onTriageComplete");
      expect(plugins.length).toBeGreaterThanOrEqual(1);
      expect(plugins[0].id).toBe("test-plugin");
    });

    it("returns empty for unmatched hook", () => {
      registerPlugin(testManifest);
      const plugins = getPluginsForHook("onReviewComplete");
      expect(plugins.filter((p) => p.id === "test-plugin")).toHaveLength(0);
    });
  });

  describe("executePluginHook", () => {
    it("returns empty for no matching plugins", async () => {
      const results = await executePluginHook("onReviewComplete", {
        userId: "test",
        repoFullName: "test/repo",
        event: "test",
        payload: {},
        apiBaseUrl: "http://localhost",
      });
      expect(results).toHaveLength(0);
    });
  });

  describe("getMarketplacePlugins", () => {
    it("returns marketplace plugins", () => {
      const plugins = getMarketplacePlugins();
      expect(plugins.length).toBeGreaterThan(0);
      expect(plugins[0]).toHaveProperty("manifest");
      expect(plugins[0]).toHaveProperty("downloads");
      expect(plugins[0]).toHaveProperty("rating");
    });
  });

  describe("searchMarketplace", () => {
    it("finds plugins by name", () => {
      const results = searchMarketplace("slack");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].manifest.id).toContain("slack");
    });

    it("returns empty for no matches", () => {
      const results = searchMarketplace("xyznonexistent");
      expect(results).toHaveLength(0);
    });
  });

  describe("installPlugin", () => {
    it("installs a marketplace plugin", async () => {
      const result = await installPlugin("test-user", "gritgauge-slack-notifier");
      expect(result.success).toBe(true);
      expect(getPlugin("gritgauge-slack-notifier")).toBeDefined();
    });

    it("fails for unknown plugin", async () => {
      const result = await installPlugin("test-user", "nonexistent");
      expect(result.success).toBe(false);
    });
  });
});
