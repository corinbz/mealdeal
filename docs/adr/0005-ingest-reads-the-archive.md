# Ingest reads the archive, not the Chains

Only one component talks to a Chain: the archiver, which takes a Sweep and
writes the responses down verbatim. Everything that turns those responses into
Products, Observations and Offers reads the archive instead, so the two never
contend for the same traffic.

The obvious shape — and the one the original spec described — has ingest fetch
from each Chain itself, with its tests faking HTTP. That would have put Jumbo's
category paging and Dirk's per-Store batching in two places, doubled our
traffic to Chains whose terms already prohibit automated collection, and left
ingest able to see only today. Reading the archive instead means a parser
improved in three months can be re-run over every day already captured, which
is the entire reason ADR-0002 keeps raw responses: derivation is cheap to redo,
a day of prices is impossible to recover.

## Consequences

- There is no HTTP anywhere in the ingest path, so nothing has to be faked in
  its tests. The one seam is a directory of archived responses.
- The archive, not the database, is the system of record. Dropping the database
  costs a re-ingest; losing the archive costs the history.
- A Chain's own fault is preserved rather than smoothed over. One Jumbo
  category of 1134 returns `data: null` because a non-nullable field was null
  on their side; the archive keeps that response, and the run counts it.
- This also keeps the posture Innoweb (C-202/12) argues for — a periodic
  independent index rather than a live query relay — as a property of the
  architecture rather than a rule someone has to remember. A well-meaning
  "just fetch it live" change would now have to delete a component to happen.
