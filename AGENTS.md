# mealdeal

Grocery price aggregation and comparison across Dutch supermarket chains.

## Raw response archive

A daily job records exactly what each Chain's public endpoint said, parsing
nothing. It exists ahead of the ingest pipeline because price history cannot
be backfilled. `npm run archive -- --chain dirk`. Dirk works; Jumbo is blocked
on a user-agent decision. See `docs/archive.md`.

## Ingest

Reads a day out of the archive into Postgres as Products, price observations
and Offers. Never contacts a Chain: the archiver owns that path, so a parser
improved later can be re-run over every day already captured.
`npm run db:up && npm run db:migrate && npm run ingest -- --chain dirk`.
Dirk is verified on real data; Jumbo's reader is unproven for want of a real
response. See `docs/ingest.md`.

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
