/// <reference path="./.sst/platform/config.d.ts" />

const localDbConfig = {
  username: "postgres",
  password: "password",
  database: "local",
  host: "localhost",
  port: 5433,
};

async function checkDockerDaemon() {
  const { execSync } = await import("child_process");
  try {
    execSync("docker ps", { stdio: 'ignore' });
  } catch (error) {
    console.error(`\n❌ Docker daemon check failed. Please ensure Docker is running.\n   (Error: ${error instanceof Error ? error.message : 'Unknown error'})`);
    process.exit(1);
  }
}

async function runDockerPostgres(cfg: {
  database: string;
  username: string;
  password: string;
  port: number;
  host?: string;
}) {
  const { spawn } = await import("child_process");
  const { execSync } = await import("child_process");
  const waitOnModule = await import("wait-on");
  const waitOn = (waitOnModule as any).default;

  const container = "sst-dev-postgres";

  let cleanedPrevious = false;
  try {
    const stopOutput = execSync(`docker stop ${container}`, { stdio: 'pipe' }).toString();
    if (stopOutput.trim() === container) cleanedPrevious = true;
  } catch (error) {}
  try {
    const rmOutput = execSync(`docker rm ${container}`, { stdio: 'pipe' }).toString();
    if (rmOutput.trim() === container) cleanedPrevious = true;
  } catch (error) {}
  
  if (cleanedPrevious) {
    console.log(`ℹ️ Removed previous container named '${container}'.`);
  }

  const volume = `${process.cwd()}/.sst/storage/postgres:/var/lib/postgresql/data`;
  const args = [
    "run", "--rm", "--name", container, "-d", "-p", `${cfg.port}:5432`,
    "-v", volume, 
    "-e", `POSTGRES_USER=${cfg.username}`,
    "-e", `POSTGRES_PASSWORD=${cfg.password}`,
    "-e", `POSTGRES_DB=${cfg.database}`,
    "postgres:16.4",
  ];

  const dockerProcess = spawn("docker", args, { stdio: "inherit" });

  dockerProcess.on('error', (err) => {
    console.error("\n❌ Failed to spawn Docker process for the container.");
    console.error("   Error details:", err.message);
    process.exit(1);
  });

  try {
    await waitOn({
      resources: [`tcp:${cfg.host || "localhost"}:${cfg.port}`],
      timeout: 30_000,
      delay: 500,
      log: false, 
    });
    console.log("✅ Postgres container is ready.");
  } catch (err) {
    console.error(`\n❌ Postgres container failed to start or become ready on port ${cfg.port} within 30s.`);
    console.error(`   Check container logs (if it exists): docker logs ${container}`);
    process.exit(1);
  }

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      execSync(`docker stop ${container}`, { stdio: 'ignore' });
    } catch (error) {
    }
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

async function runLocalPostgres(cfg: {
  database: string;
  username: string;
  password: string;
  port: number;
  host?: string;
}) {
  await checkDockerDaemon();
  await runDockerPostgres(cfg);
}

async function runMigrations(migrator: sst.aws.Function) {
  if (!$dev) {
    // Production environment logic
    new aws.lambda.Invocation(`DatabaseMigratorInvocation`, {
      functionName: migrator.name,
      input: JSON.stringify({ timestamp: Date.now() }), 
    });
  } else {
    // Dev environment logic
    await runLocalPostgres(localDbConfig);
    try {
      const { execSync } = await import("child_process");
      execSync('pnpm run --prefix apps/backend db:migrate', { stdio: 'inherit' });
      console.log("Local migration script completed successfully.");
    } catch (error) {
      console.error("Local migration script failed. See output above.");
      process.exit(1);
    }
  }
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

    const geminiKey = new sst.Secret("GeminiAPIKey");

    const vpc = new sst.aws.Vpc("MyVpc", { nat: "ec2" });

    const database = new sst.aws.Aurora("MyPostgres", {
      engine: "postgres",
      vpc,
      dev: localDbConfig 
    });

    const cluster = new sst.aws.Cluster("MyCluster", { vpc });

    const honoContainer = new sst.aws.Service("HonoContainer", {
      link: [geminiKey, database],
      cluster,
      loadBalancer: {
        domain: "api.echo-sketch.com",
        rules: [
          { listen: "80/http", redirect: "443/https" },
          { listen: "443/https", forward: "3001/http" }
        ]
      },
      dev: {
        command: "pnpm run dev",
      },
      image: {
        dockerfile: "./backend.Dockerfile",
      },
    });

    const migrator = new sst.aws.Function("DatabaseMigrator", {
      handler: "apps/backend/src/db/migrator.handler",
      link: [database],
      vpc,
      copyFiles: [
        {
          from: "apps/backend/drizzle",
          to: "./drizzle",
        }
      ],
    });

    const web = new sst.aws.StaticSite("Web", {
      path: "apps/frontend",
      environment: {
        VITE_API_URL: $dev ? "http://localhost:3001" : honoContainer.url 
      },
      build: {
        command: "npm run build",
        output: "dist"
      },
      domain: "echo-sketch.com"
    });

    await runMigrations(migrator);

    new sst.x.DevCommand("DbStudio", {
      link: [database],
      dev: {
        command: "pnpm --filter backend run db:studio",
      },
    });

    return {
      web: web.url,
      hono: honoContainer.url
    }
  },
});