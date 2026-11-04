import { execute, type PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  await execute(connection, `
    CREATE TABLE digital_download (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_item_id integer NOT NULL REFERENCES order_item(order_item_id) ON DELETE CASCADE,
      bucket text NOT NULL,
      object_key text NOT NULL,
      version_id text NOT NULL,
      name text NOT NULL,
      disabled boolean NOT NULL DEFAULT false,
      issued_count integer NOT NULL DEFAULT 0,
      last_issued_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX digital_download_order_item ON digital_download(order_item_id);
  `);
};
