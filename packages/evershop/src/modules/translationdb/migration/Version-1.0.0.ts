import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * DB-backed content translations (the §6.20 override seam made real).
 *
 * Static UI strings still ship as CSV packs under `translations/<locale>/`;
 * user-authored content (category names, product names, menu labels, ...) is
 * translated through rows in this table. `source` holds the source-language
 * string as stored on the entity, `target` the localized text. The dictionary
 * builder merges these rows over the disk base, so adding content never
 * requires a deploy — and the polling refresher in this module's bootstrap
 * picks changes up without a restart either.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE TABLE translation_override (
      "translation_override_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "locale" varchar(10) NOT NULL,
      "source" text NOT NULL,
      "target" text NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "TRANSLATION_OVERRIDE_LOCALE_SOURCE_UNIQUE" UNIQUE ("locale", "source")
    )`
  );
};
