-- mealdeal ingest schema.
--
-- The shape here follows three decisions that are easy to undo by accident:
--
--   * Observations are APPEND ONLY. Price history cannot be backfilled, so an
--     UPDATE that overwrites yesterday's observation destroys something
--     unrecoverable. Triggers below refuse the operation rather than trusting
--     every future caller to remember.
--   * Price scope is explicit. A row carries a store_ref or NULL, where NULL
--     means the price applies across the Chain nationally. Jumbo publishes
--     national prices; Dirk's are genuinely per-Store. Neither is forced into
--     the other's shape.
--   * EANs are many-to-one from the start, even though Jumbo currently sends
--     one. Two of the assessed Chains return arrays, and retrofitting this
--     later is a migration.

CREATE TABLE IF NOT EXISTS chain (
  id   text PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('National Chain', 'Regional Chain'))
);

-- A Product in one Chain's assortment, identified by that Chain's own
-- reference. No cross-Chain identity is asserted here, not even between
-- Products sharing an EAN (ADR-0001): Basket Items resolve per Chain.
CREATE TABLE IF NOT EXISTS product (
  chain_id          text NOT NULL REFERENCES chain (id),
  chain_product_ref text NOT NULL,
  name              text NOT NULL,
  brand             text,
  -- The Chain's own pack-size wording, kept verbatim even when unparseable,
  -- so improving the parser later can recover Products without re-scraping
  -- time that has already passed.
  pack_text         text,
  pack_quantity     numeric,
  comparison_unit   text CHECK (comparison_unit IN ('kg', 'l', 'piece')),
  is_weight_product boolean NOT NULL DEFAULT false,
  first_seen_on     date NOT NULL,
  last_seen_on      date NOT NULL,
  PRIMARY KEY (chain_id, chain_product_ref)
);

CREATE TABLE IF NOT EXISTS product_ean (
  chain_id          text NOT NULL,
  chain_product_ref text NOT NULL,
  ean               text NOT NULL,
  PRIMARY KEY (chain_id, chain_product_ref, ean),
  FOREIGN KEY (chain_id, chain_product_ref) REFERENCES product (chain_id, chain_product_ref)
);

CREATE TABLE IF NOT EXISTS ingest_run (
  id                 bigserial PRIMARY KEY,
  chain_id           text NOT NULL REFERENCES chain (id),
  archive_date       date NOT NULL,
  started_at         timestamptz NOT NULL DEFAULT now(),
  finished_at        timestamptz,
  outcome            text NOT NULL DEFAULT 'running'
                       CHECK (outcome IN ('running', 'complete', 'failed', 'rejected')),
  products_seen      integer NOT NULL DEFAULT 0,
  products_recorded  integer NOT NULL DEFAULT 0,
  prices_recorded    integer NOT NULL DEFAULT 0,
  offers_recorded    integer NOT NULL DEFAULT 0,
  -- Observations with no Unit Price, and so not comparison candidates.
  -- Counts the outcome rather than one cause: Dirk gets here through
  -- unparseable pack wording, Jumbo through publishing no Unit Price itself.
  without_unit_price integer NOT NULL DEFAULT 0,
  parse_failures     integer NOT NULL DEFAULT 0,
  notes              text
);

CREATE TABLE IF NOT EXISTS price_observation (
  id                bigserial PRIMARY KEY,
  run_id            bigint NOT NULL REFERENCES ingest_run (id),
  chain_id          text NOT NULL,
  chain_product_ref text NOT NULL,
  -- NULL means "applies across the Chain", not "unknown".
  store_ref         text,
  observed_at       timestamptz NOT NULL,
  shelf_price_cents integer NOT NULL CHECK (shelf_price_cents >= 0),
  offer_price_cents integer CHECK (offer_price_cents >= 0),
  unit_price_cents  integer CHECK (unit_price_cents >= 0),
  comparison_unit   text CHECK (comparison_unit IN ('kg', 'l', 'piece')),
  -- Which figure this is: the Chain's own published Unit Price, or one we
  -- derived from pack text. The Chain's own is what it legally represents to
  -- the consumer at the shelf, so the distinction has to survive storage.
  unit_price_source text CHECK (unit_price_source IN ('chain', 'derived')),
  FOREIGN KEY (chain_id, chain_product_ref) REFERENCES product (chain_id, chain_product_ref)
);

CREATE INDEX IF NOT EXISTS price_observation_product_idx
  ON price_observation (chain_id, chain_product_ref, observed_at DESC);

CREATE TABLE IF NOT EXISTS offer_observation (
  id              bigserial PRIMARY KEY,
  run_id          bigint NOT NULL REFERENCES ingest_run (id),
  chain_id        text NOT NULL REFERENCES chain (id),
  store_ref       text,
  chain_offer_ref text NOT NULL,
  headline        text,
  -- The Chain's advertised wording, exactly as written (ADR-0002). Nothing
  -- derives an effective price, a percentage, or per-quantity mechanics from
  -- this column: a Dutch Offer's true unit price is a function of how many
  -- you buy, and modelling that is deliberately deferred.
  wording         text,
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_upcoming     boolean NOT NULL DEFAULT false,
  observed_at     timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS offer_product (
  offer_observation_id bigint NOT NULL REFERENCES offer_observation (id),
  chain_product_ref    text NOT NULL,
  PRIMARY KEY (offer_observation_id, chain_product_ref)
);

-- ── Append-only enforcement ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refuse_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'append-only: % on % is refused. Price history cannot be backfilled, so an observation must never be overwritten or removed.',
    TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS price_observation_append_only ON price_observation;
CREATE TRIGGER price_observation_append_only
  BEFORE UPDATE OR DELETE ON price_observation
  FOR EACH ROW EXECUTE FUNCTION refuse_mutation();

DROP TRIGGER IF EXISTS offer_observation_append_only ON offer_observation;
CREATE TRIGGER offer_observation_append_only
  BEFORE UPDATE OR DELETE ON offer_observation
  FOR EACH ROW EXECUTE FUNCTION refuse_mutation();

INSERT INTO chain (id, name, kind) VALUES
  ('dirk',  'Dirk',  'Regional Chain'),
  ('jumbo', 'Jumbo', 'National Chain')
ON CONFLICT (id) DO NOTHING;
