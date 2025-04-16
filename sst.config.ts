/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "echo-sketch",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          profile: input.stage === "production" ? "alextknott-production" : "alextknott-dev"
        }
      }
    };
  },
  async run() {
    const geminiKey = new sst.Secret("GeminiAPIKey");

    const hono = new sst.aws.Function("Hono", {
      link: [geminiKey],
      url: true,
      handler: "apps/backend/src/index.handler",
    });

    const web = new sst.aws.StaticSite("Web", {
      path: "apps/frontend",
      environment: {
        VITE_API_URL: hono.url
      },
      build: {
        command: "npm run build",
        output: "dist"
      }
    });

    return {
      web: web.url,
      hono: hono.url
    }
  },
});