'use strict';
// Offline only: provider keys are removed BEFORE importing the module under test.
delete process.env.OPENROUTER_API_KEY;
delete process.env.OPENAI_API_KEY;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-43a';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const pack = require('../server/routes/featurePack43a');
const { filterRecords, toCSV, buildSections, aiFeatures } = pack.helpers;

test('search/filter keeps only matching records', () => {
  const rows = [{ title: 'Alpha report', status: 'todo' }, { title: 'Beta', status: 'done' }];
  assert.equal(filterRecords(rows, { q: 'alpha' }).length, 1);
  assert.equal(filterRecords(rows, { status: 'done' }).length, 1);
  assert.equal(filterRecords(rows, { q: 'missing' }).length, 0);
});

test('CSV export and labelled sections preserve false/0/empty', () => {
  const csv = toCSV([{ title: 'A', estimate: 0, done: false }]);
  assert.match(csv, /title,estimate,done|title,done,estimate/);
  assert.match(csv, /0/);
  const sections = buildSections({ estimate: 0, done: false, notes: '' });
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
  assert.equal(byKey.estimate.value, 0); assert.equal(byKey.estimate.display, '0');
  assert.equal(byKey.done.value, false); assert.equal(byKey.done.display, 'false');
  assert.equal(byKey.notes.value, ''); assert.equal(byKey.notes.display, '(empty)');
});

test('deterministic domain fallback is labelled aiGenerated:false', () => {
  assert.ok(aiFeatures.length >= 2 && aiFeatures.length <= 3);
  for (const f of aiFeatures) {
    const out = pack.helpers.fallbackEnvelope(f.name, f.run([{ title: 'Sample', status: 'todo', estimate: 0, done: false }]), [{}]);
    assert.equal(out.aiGenerated, false);
    assert.equal(out.source, 'deterministic-fallback');
    assert.ok(Array.isArray(out.sections));
  }
});

test('authenticated tasks list/create/update + export require auth', async () => {
  const app = express(); app.use(express.json()); app.use('/api/tasks', pack);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/tasks`;
  try {
    assert.equal((await fetch(base)).status, 401);
    const token = jwt.sign({ id: 7, email: 't@example.com' }, process.env.JWT_SECRET);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const created = await (await fetch(base, { method: 'POST', headers, body: JSON.stringify({ title: 'FP43A task', status: 'todo' }) })).json();
    assert.equal(created.title, 'FP43A task');
    const updated = await (await fetch(`${base}/${created.id}`, { method: 'PUT', headers, body: JSON.stringify({ status: 'done', done: true, estimate: 0 }) })).json();
    assert.equal(updated.status, 'done'); assert.equal(updated.estimate, 0);
    const list = await (await fetch(`${base}?status=done`, { headers })).json();
    assert.equal(list.total, 1);
    const csv = await (await fetch(`${base}/export?format=csv`, { headers })).text();
    assert.match(csv, /FP43A task/);
    const json = await (await fetch(`${base}/export?format=json`, { headers })).json();
    assert.equal(json.length, 1);
    const ai = await (await fetch(`${base}/ai/${aiFeatures[0].name}`, { method: 'POST', headers, body: JSON.stringify({ records: [{ title: 'Sample' }] }) })).json();
    assert.equal(ai.aiGenerated, false);
  } finally { server.close(); }
});
