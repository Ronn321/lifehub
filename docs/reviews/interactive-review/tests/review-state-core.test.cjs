const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../review-state-core.js');

function reviewFixture(version = 1) {
  return {
    reportId: 'lifehub-ui-2026-08-22',
    version,
    title: `UI Review R${version}`,
    areas: [
      {
        id: 'dashboard',
        tab: 'Dashboard',
        findings: [
          {
            id: 'UI-001', severity: 1, title: 'Kontrast', detail: 'Alt',
            suggestions: [{ id: 'UI-001-F1', title: 'Kontrast korrigieren', note: 'AA erreichen' }],
          },
          {
            id: 'UI-002', severity: 2, title: 'Abstand', detail: 'Unverändert',
            suggestions: [{ id: 'UI-002-F1', title: 'Spacing korrigieren', note: 'Raster' }],
          },
        ],
      },
    ],
  };
}

test('stableStringify and hashValue ignore object key order', () => {
  const a = { b: 2, a: { y: 1, x: 3 } };
  const b = { a: { x: 3, y: 1 }, b: 2 };
  assert.equal(Core.stableStringify(a), Core.stableStringify(b));
  assert.equal(Core.hashValue(a), Core.hashValue(b));
});

test('schema-1 feedback migrates into schema-2 draft without data loss', () => {
  const old = {
    schema: 1,
    reviewVersion: 1,
    findings: { 'UI-001': { decision: 'accept', comment: 'Bitte sofort' } },
    areas: { dashboard: { comment: 'Allgemein enger' } },
    markers: [{ uid: 7, imageId: 'dash', type: 'rect', x: .1, y: .2, w: .3, h: .4, comment: 'Hier' }],
    done: true,
  };
  const state = Core.normalizeFeedbackState(old, 'lifehub-ui-2026-08-22', 1);
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.draft.findings['UI-001'].decision, 'accept');
  assert.equal(state.draft.areas.dashboard.comment, 'Allgemein enger');
  assert.equal(state.draft.markers[0].comment, 'Hier');
  assert.equal(state.revisions.length, 0);
});

test('finalizing FA v1 exports full state and a complete first delta', () => {
  let state = Core.createBlankState('lifehub-ui-2026-08-22', 1);
  state.draft.findings['UI-001'] = {
    decision: 'accept',
    comment: 'Umsetzen',
    suggestions: { 'UI-001-F1': { decision: 'accept', comment: '' } },
  };
  state.draft.areas.dashboard = { comment: 'Karten enger' };
  state.draft.markers.push({ id: 'mk-1', imageId: 'dash', findingId: 'UI-001', type: 'rect', x: .1, y: .1, w: .2, h: .2, comment: 'Markierung' });

  const result = Core.finalizeChangeRequest(state, reviewFixture(1), { exportedAt: '2026-08-22T10:00:00Z' });
  assert.equal(result.created, true);
  assert.equal(result.payload.changeRequestVersion, 1);
  assert.equal(result.payload.baseChangeRequestVersion, 0);
  assert.equal(result.payload.fullState.findings['UI-001'].decision, 'accept');
  assert.ok(result.payload.deltaFromPrevious.operations.length > 0);
  assert.equal(result.payload.actionSummary.acceptedSuggestions[0].suggestionId, 'UI-001-F1');
  assert.equal(result.state.revisions.length, 1);
});

test('FA v2 contains full latest truth but delta only includes changed ten percent', () => {
  let state = Core.createBlankState('lifehub-ui-2026-08-22', 1);
  for (let i = 1; i <= 10; i++) {
    state.draft.findings[`F-${i}`] = { decision: 'accept', comment: `v1-${i}`, suggestions: {} };
  }
  let first = Core.finalizeChangeRequest(state, { reportId: state.reportId, version: 1, title: 'R1', areas: [] }, { exportedAt: 't1' });
  state = first.state;
  state.draft.findings['F-10'].comment = 'v2-geändert';
  const second = Core.finalizeChangeRequest(state, { reportId: state.reportId, version: 1, title: 'R1', areas: [] }, { exportedAt: 't2' });

  assert.equal(second.created, true);
  assert.equal(second.payload.changeRequestVersion, 2);
  assert.equal(second.payload.baseChangeRequestVersion, 1);
  assert.equal(Object.keys(second.payload.fullState.findings).length, 10);
  assert.equal(second.payload.fullState.findings['F-1'].comment, 'v1-1');
  assert.equal(second.payload.fullState.findings['F-10'].comment, 'v2-geändert');
  assert.deepEqual(second.payload.deltaFromPrevious.changedFindingIds, ['F-10']);
  assert.equal(second.payload.deltaFromPrevious.unchangedFindingCount, 9);
  assert.deepEqual(Core.applyOperations(first.payload.fullState, second.payload.deltaFromPrevious.operations), second.payload.fullState);
});

test('finalization does not create a redundant version when nothing changed', () => {
  let state = Core.createBlankState('lifehub-ui-2026-08-22', 1);
  state.draft.findings['UI-001'] = { decision: 'accept', comment: '', suggestions: {} };
  state = Core.finalizeChangeRequest(state, reviewFixture(1), { exportedAt: 't1' }).state;
  const again = Core.finalizeChangeRequest(state, reviewFixture(1), { exportedAt: 't2' });
  assert.equal(again.created, false);
  assert.equal(again.reason, 'unchanged');
  assert.equal(again.state.revisions.length, 1);
});

test('agent scope uses delta only when preceding change request was implemented', () => {
  const payload = { changeRequestVersion: 2, baseChangeRequestVersion: 1, fullState: { findings: { a: 1 } }, deltaFromPrevious: { operations: [{ op: 'set', path: '/findings/a', value: 2 }] } };
  assert.equal(Core.selectImplementationScope(payload, 1).mode, 'delta');
  assert.equal(Core.selectImplementationScope(payload, null).mode, 'full');
  assert.equal(Core.selectImplementationScope(payload, 0).mode, 'full');
});

test('review diff reports new, changed, unchanged and removed finding IDs', () => {
  const prev = reviewFixture(1);
  const next = reviewFixture(2);
  next.areas[0].findings[0].detail = 'Neu';
  next.areas[0].findings.splice(1, 1);
  next.areas[0].findings.push({ id: 'UI-003', severity: 3, title: 'Neu', detail: 'Neu', suggestions: [] });
  const diff = Core.diffReviewVersions(prev, next);
  assert.equal(diff.byFindingId['UI-001'], 'changed');
  assert.equal(diff.byFindingId['UI-002'], 'removed');
  assert.equal(diff.byFindingId['UI-003'], 'new');
  assert.deepEqual(diff.counts, { new: 1, changed: 1, unchanged: 0, removed: 1 });
});

test('area-level fix decisions are exported for the agent', () => {
  const review = reviewFixture(1);
  review.areas[0].suggestions = [{ id: 'AREA-DASH-F1', title: 'Dashboard als Paket', note: 'Gemeinsam ändern' }];
  let state = Core.createBlankState(review.reportId, review.version);
  state.draft.areas.dashboard = {
    comment: 'Bereichskommentar',
    suggestions: { 'AREA-DASH-F1': { decision: 'accept', comment: 'Genau so' } },
  };
  const result = Core.finalizeChangeRequest(state, review, { exportedAt: 't1' });
  assert.equal(result.payload.actionSummary.acceptedAreaSuggestions[0].areaId, 'dashboard');
  assert.equal(result.payload.actionSummary.acceptedAreaSuggestions[0].suggestionId, 'AREA-DASH-F1');
  assert.equal(result.payload.actionSummary.acceptedAreaSuggestions[0].comment, 'Genau so');
});

test('marker numbering remains stable per image', () => {
  const markers = [{ imageId: 'a', nr: 1 }, { imageId: 'b', nr: 1 }, { imageId: 'a', nr: 3 }];
  assert.equal(Core.nextMarkerNumber(markers, 'a'), 4);
  assert.equal(Core.nextMarkerNumber(markers, 'b'), 2);
});
