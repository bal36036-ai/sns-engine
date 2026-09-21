// Supabase(sns スキーマ)への接続クライアント
// 接続先・スキーマ名はすべて環境変数から取得し、コードへ直書きしない。
// 将来別Supabaseプロジェクトへ移行する場合も、環境変数を変えるだけで済む設計。

const { Pool } = require("pg");

function getPool() {
  const host = process.env.SNS_DB_HOST || "db.dvysbebkzvvqyqtlgqcx.supabase.co";
  const port = process.env.SNS_DB_PORT || "5432";
  const database = process.env.SNS_DB_NAME || "postgres";
  const user = process.env.SNS_DB_USER || "sns_engine";
  const password = process.env.SNS_ENGINE_DB_PASSWORD;
  const schema = process.env.SNS_DB_SCHEMA || "sns";

  if (!password) {
    throw new Error("環境変数 SNS_ENGINE_DB_PASSWORD が見つかりません。");
  }

  return new Pool({
    host,
    port: Number(port),
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    options: `-c search_path=${schema},public`,
  });
}

module.exports = { getPool };
