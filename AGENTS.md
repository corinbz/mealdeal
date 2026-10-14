# mealdeal

Grocery price aggregation and comparison across Dutch supermarket chains.

## Raw response archive

A daily Sweep of each Chain records exactly what its public endpoint said,
parsing nothing. It exists ahead of the ingest pipeline because price history
cannot be backfilled. `npm run archive -- --chain dirk`. Dirk, Jumbo, Vomar and Plus
work; Jumbo only answers a browser user agent, which the owner chose to send,
and which a local run must pass explicitly. Vomar publishes no Offers, and
Plus no EANs. See `docs/archive.md`.

## Ingest

Reads a day out of the archive into Postgres as Products, price observations
and Offers. Never contacts a Chain: the archiver owns that path, so a parser
improved later can be re-run over every day already captured.
`npm run db:up && npm run db:migrate && npm run ingest -- --chain dirk`.
Dirk and Jumbo are verified on real data swept 2026-10-13, Vomar and Plus on 2026-10-14. See `docs/ingest.md`.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `corinbz/mealdeal`, managed via the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
