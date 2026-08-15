import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('authenticated query data is kept out of persistent browser storage', async () => {
  const mainSource = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');

  assert.match(mainSource, /QueryClientProvider/);
  assert.doesNotMatch(mainSource, /PersistQueryClientProvider|createSyncStoragePersister/);
});
