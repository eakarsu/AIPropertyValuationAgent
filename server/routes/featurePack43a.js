'use strict';
// Feature Pack 43A — authenticated tasks, search/filter, CSV/JSON export,
// deterministic domain helpers over the caller's own records.
// Offline by design: no provider calls are made here. When no AI provider is
// configured the deterministic fallback below is used and is always labelled
// with aiGenerated:false. Provider keys are never read by this module.
const express = require('express');
const jwt = require('jsonwebtoken');

const FALLBACK_LABEL = 'Deterministic fallback (offline) — not AI-generated';

function formatDisplay(value) {
  if (value === false) return 'false';
  if (value === 0) return '0';
  if (value === '' || value === null || value === undefined) return '(empty)';
  if (Array.isArray(value)) return value.length ? value.map(formatDisplay).join(', ') : '(empty)';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Labelled sections that preserve false / 0 / empty values instead of hiding them.
function buildSections(record) {
  if (!record || typeof record !== 'object') return [{ key: 'value', label: 'Value', value: record ?? null, display: formatDisplay(record) }];
  return Object.entries(record).map(([key, value]) => ({
    key,
    label: key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: value === undefined ? null : value,
    display: formatDisplay(value),
  }));
}

function filterRecords(records, query) {
  const q = String((query && query.q) || (query && query.search) || '').trim().toLowerCase();
  const status = String((query && query.status) || '').trim().toLowerCase();
  const priority = String((query && query.priority) || '').trim().toLowerCase();
  return (Array.isArray(records) ? records : []).filter((r) => {
    if (status && String(r.status ?? '').toLowerCase() !== status) return false;
    if (priority && String(r.priority ?? '').toLowerCase() !== priority) return false;
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    return true;
  });
}

function toCSV(records) {
  const rows = Array.isArray(records) ? records : [];
  if (!rows.length) return '';
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => JSON.stringify(v === undefined || v === null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v));
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function tokens(text) { return new Set(String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)); }
function jaccard(a, b) {
  const A = tokens(a); const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; A.forEach((t) => { if (B.has(t)) inter += 1; });
  return inter / (A.size + B.size - inter);
}


const aiFeatures = [
  { name: 'valuation-range', run(records) {
      const values = records.map((r) => Number(r.estimatedValue ?? r.price ?? r.value)).filter(Number.isFinite);
      const perSqft = records.map((r) => { const v = Number(r.estimatedValue ?? r.price); const s = Number(r.sqft ?? r.squareFeet); return s > 0 && Number.isFinite(v) ? v / s : NaN; }).filter(Number.isFinite);
      return { count: values.length, min: values.length ? Math.min(...values) : 0, median: median(values), max: values.length ? Math.max(...values) : 0, medianPricePerSqft: Math.round(median(perSqft) * 100) / 100 };
  } },
  { name: 'risk-flags', run(records) {
      const med = median(records.map((r) => Number(r.estimatedValue ?? r.price)).filter(Number.isFinite));
      const flagged = records.filter((r) => {
        const v = Number(r.estimatedValue ?? r.price);
        return !r.address && !r.title || (med > 0 && Number.isFinite(v) && v > med * 2);
      }).map((r) => ({ id: r.id ?? null, reason: !r.address && !r.title ? 'missing address/title' : 'value above 2x median' }));
      return { flagged, flaggedCount: flagged.length, medianUsed: med };
  } },
  { name: 'investment-screen', run(records) {
      const screened = records.map((r) => {
        const price = Number(r.estimatedValue ?? r.price); const rent = Number(r.monthlyRent ?? r.rent);
        const ratio = price > 0 && Number.isFinite(rent) ? Math.round((rent / price) * 10000) / 10000 : 0;
        return { id: r.id ?? null, rentToPriceRatio: ratio, hasRentData: Number.isFinite(rent) && rent > 0 };
      });
      return { screened, withRentData: screened.filter((s) => s.hasRentData).length };
  } },
];

function fallbackEnvelope(feature, result, records) {
  return {
    feature,
    aiGenerated: false,
    source: 'deterministic-fallback',
    label: FALLBACK_LABEL,
    recordCount: Array.isArray(records) ? records.length : 0,
    ...result,
    sections: buildSections(result && typeof result === 'object' ? result : { result }),
  };
}

const router = express.Router();
const store = new Map();
let seq = 0;

function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(503).json({ error: 'JWT_SECRET not configured' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try { req.user = jwt.verify(token, secret); return next(); } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

function ownTasks(req) { return [...store.values()].filter((t) => String(t.ownerId) === String(req.user.id ?? req.user.email ?? '')); }

router.get('/export', requireAuth, (req, res) => {
  const rows = filterRecords(ownTasks(req), req.query);
  const format = String(req.query.format || 'json').toLowerCase();
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');
    return res.send(toCSV(rows));
  }
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks.json"');
    return res.send(JSON.stringify(rows, null, 2));
  }
  return res.status(400).json({ error: 'format must be csv or json' });
});

router.get('/', requireAuth, (req, res) => {
  const rows = filterRecords(ownTasks(req), req.query);
  return res.json({ data: rows, total: rows.length });
});

router.post('/', requireAuth, (req, res) => {
  const title = String((req.body || {}).title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  seq += 1;
  const now = new Date().toISOString();
  const task = {
    id: seq,
    title,
    status: String(req.body.status || 'todo'),
    priority: String(req.body.priority || 'medium'),
    notes: req.body.notes === undefined ? '' : req.body.notes,
    done: req.body.done === undefined ? false : Boolean(req.body.done),
    estimate: req.body.estimate === undefined ? 0 : Number(req.body.estimate) || 0,
    ownerId: req.user.id ?? req.user.email ?? '',
    createdAt: now,
    updatedAt: now,
  };
  store.set(task.id, task);
  return res.status(201).json(task);
});

router.put('/:id', requireAuth, (req, res) => {
  const task = store.get(Number(req.params.id));
  if (!task || String(task.ownerId) !== String(req.user.id ?? req.user.email ?? '')) return res.status(404).json({ error: 'Task not found' });
  for (const key of ['title', 'status', 'priority', 'notes']) {
    if (req.body && req.body[key] !== undefined) task[key] = req.body[key];
  }
  if (req.body && req.body.done !== undefined) task.done = Boolean(req.body.done);
  if (req.body && req.body.estimate !== undefined) task.estimate = Number(req.body.estimate) || 0;
  task.updatedAt = new Date().toISOString();
  return res.json(task);
});

router.get('/:id/sections', requireAuth, (req, res) => {
  const task = store.get(Number(req.params.id));
  if (!task || String(task.ownerId) !== String(req.user.id ?? req.user.email ?? '')) return res.status(404).json({ error: 'Task not found' });
  return res.json({ id: task.id, sections: buildSections(task) });
});

for (const feature of aiFeatures) {
  router.post(`/ai/${feature.name}`, requireAuth, (req, res) => {
    const records = req.body && Array.isArray(req.body.records) ? req.body.records : ownTasks(req);
    return res.json(fallbackEnvelope(feature.name, feature.run(records), records));
  });
}

router.helpers = { filterRecords, toCSV, buildSections, formatDisplay, fallbackEnvelope, FALLBACK_LABEL, aiFeatures };
module.exports = router;
