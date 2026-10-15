# "Klopt niet" reports

A ⚑ sits on every Product row in the app: Lijst, Vergelijk, Winkelen,
Bladeren (all three views) and a Recipe's ingredients (#38). One tap opens a
sheet: the person picks what is wrong (*verkeerd product*, *prijs klopt
niet*, *niet in de winkel*, *anders*) and may add a note. Everything else is
filled in by the page: the Chain, the Product's ref and name, the Ingredient
and Variant it was matched to, the price shown, the day its prices are from,
and where in the app the person was.

**Sending.** A report waits in the browser's localStorage until the server
has taken it, so one made in a shop with no signal goes on the next visit or
when the phone is back online. The sheet says which happened.

**Storing.** `functions/api/report.ts` is a Cloudflare Pages Function,
deployed with the site by `.github/workflows/app.yml`, which binds it to the
archive's R2 bucket. Each report is one object,
`reports/<day>/<hour>-<sender>-<uuid>.json`. No account is needed, so the
function caps a body at 4 KB and each field to a length, refuses anything
that is not a report, and takes at most 20 an hour from one address. The
address is never stored: `<sender>` is a hash of it, salted per day (and with
`REPORT_SALT`, if that secret is set on the Pages project).

**Reading.** The morning refresh appends the last seven days of reports,
grouped by Product with the most reported first, to its run summary
(`scripts/reports.ts`). To read them elsewhere, sync `reports/` from the
bucket and run `node scripts/reports.ts <dir> [--since YYYY-MM-DD]`.
