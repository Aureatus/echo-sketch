/// <reference path="./.sst/platform/config.d.ts" />

async function runLocalPostgres(cfg: {
  database: string;
  username: string;
  password: string;
  port: number;
  host?: string;
}) {
  const { spawn } = await import("child_process");
  // Import the module
  const waitOnModule = await import("wait-on");
  // Access the function via the .default property, overriding types
  const waitOn = (waitOnModule as any).default;

  const container = "sst-dev-postgres";
  const volume = `${process.cwd()}/.sst/storage/postgres:/var/lib/postgresql/data`;

  const args = [
    "run",
    "--rm",
    "--name",
    container,  
    "-d",
    "-p",
    `${cfg.port}:5432`,
    "-v",
    volume,
    `-e POSTGRES_USER=${cfg.username}`,
    `-e POSTGRES_PASSWORD=${cfg.password}`,
    `-e POSTGRES_DB=${cfg.database}`,
    "postgres:16.4",
  ];

  spawn("docker", args, { stdio: "inherit" });

  // 2) wait until Postgres accepts connections
  await waitOn({
    resources: [`tcp:${cfg.host || "localhost"}:${cfg.port}`],
    timeout: 30_000,
  });

  // 3) register cleanup for both SIGINT and normal exit
  const cleanup = () => {
    spawn("docker", ["stop", container], { stdio: "ignore" });
  };
  process.on("SIGINT", cleanup);
  process.on("exit",  cleanup);
}
// ────────────────────────────────────────────────────────────────────────────

export default $config({
  app(input) {
    return {
      name: "echo-sketch",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          profile: input.stage === "production" ? "alextknott" : "alextknott-dev"
        }
      }
    };
  },
  async run() {
    const isDev = process.env.SST_STAGE !== "production";
    const localDbConfig = {
      username: "postgres",
      password: "password",
      database: "local",
      host: "localhost",
      port: 5433,
    };

    if (isDev) {
      await runLocalPostgres(localDbConfig);
    }

    const geminiKey = new sst.Secret("GeminiAPIKey");

    const vpc = new sst.aws.Vpc("MyVpc", { nat: "ec2" });

    const database = new sst.aws.Aurora("MyPostgres", {
      engine: "postgres",
      vpc,
      dev: localDbConfig 
    });

    

    const hono = new sst.aws.Function("Hono", {
      link: [geminiKey, database],
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
      },
      domain: "echo-sketch.com"
    });

    return {
      web: web.url,
      hono: hono.url
    }
  },
});