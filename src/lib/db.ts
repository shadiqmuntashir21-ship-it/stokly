import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { attachDatabasePool } from "@vercel/functions";

declare global {
  var __stoklyPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum dikonfigurasi");
  }
  if (!globalThis.__stoklyPool) {
    const instance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: true }
    });
    attachDatabasePool(instance);
    globalThis.__stoklyPool = instance;
  }
  return globalThis.__stoklyPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

export async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
