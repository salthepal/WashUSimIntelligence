import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProxyTarget, onRequest } from '../functions/api/[[path]].ts';

test('fallback proxy targets stay on the configured backend origin', () => {
  const target = buildProxyTarget(
    'https://intel.wuemsim.org/api/reports?limit=10',
    'https://api.wuemsim.org',
  );

  assert.equal(target.toString(), 'https://api.wuemsim.org/reports?limit=10');
});

test('scheme-relative API paths are rejected before headers can be forwarded', async () => {
  const response = await onRequest({
    request: new Request('https://intel.wuemsim.org/api//attacker.example/collect', {
      headers: { 'cf-access-jwt-assertion': 'secret-token' },
    }),
    env: { BACKEND_URL: 'https://api.wuemsim.org' },
  });

  assert.equal(response.status, 400);
});
