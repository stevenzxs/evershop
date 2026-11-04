import { execute, type PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient) => {
  await execute(connection, `
    ALTER TABLE product ADD COLUMN digital_files jsonb DEFAULT NULL;
    ALTER TABLE variant_group ADD COLUMN digital_files jsonb DEFAULT NULL;
    ALTER TABLE product ADD CONSTRAINT product_digital_files_array
      CHECK (digital_files IS NULL OR jsonb_typeof(digital_files) = 'array');
    ALTER TABLE variant_group ADD CONSTRAINT variant_digital_files_array
      CHECK (digital_files IS NULL OR jsonb_typeof(digital_files) = 'array');
  `);
};
