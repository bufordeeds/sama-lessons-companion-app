import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[],
) {
  return pool.query<T>(text, params);
}

export default pool;
