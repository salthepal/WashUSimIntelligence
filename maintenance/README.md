# Temporary maintenance route

This Worker keeps the retired `intel.washuemsim.org` transition alias paused
without affecting the restored `intel.wuemsim.org` application or deleting the
Pages project, API Worker, D1 database, R2 bucket, Vectorize index, or deployment
history.

Deploy from the repository root:

```powershell
..\washuemsim-hub\node_modules\.bin\wrangler.cmd deploy --config maintenance\wrangler.jsonc
```

Restore the retired alias as well by deleting the maintenance Worker:

```powershell
..\washuemsim-hub\node_modules\.bin\wrangler.cmd delete --config maintenance\wrangler.jsonc
```
