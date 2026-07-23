# Temporary maintenance route

This Worker pauses `intel.wuemsim.org` and its transition alias
`intel.washuemsim.org` without deleting the Pages project,
API Worker, D1 database, R2 bucket, Vectorize index, or deployment history.

Deploy from the repository root:

```powershell
..\washuemsim-hub\node_modules\.bin\wrangler.cmd deploy --config maintenance\wrangler.jsonc
```

Restore the application by deleting the maintenance Worker:

```powershell
..\washuemsim-hub\node_modules\.bin\wrangler.cmd delete --config maintenance\wrangler.jsonc
```
