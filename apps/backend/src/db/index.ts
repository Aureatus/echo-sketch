import { drizzle } from "drizzle-orm/node-postgres";
import { Resource } from "sst";

const dbUrl = `postgresql://${Resource.MyPostgres.username}:${Resource.MyPostgres.password}@${Resource.MyPostgres.host}:${Resource.MyPostgres.port}/${Resource.MyPostgres.database}`;
const db = drizzle(dbUrl);

export default db;
