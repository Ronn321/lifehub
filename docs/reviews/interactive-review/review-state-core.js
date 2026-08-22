(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ReviewStateCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function deepClone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function stableStringify(value) {
    if (value === undefined) return '"__undefined__"';
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  }

  function hashValue(value) {
    const text = stableStringify(value);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function blankDraft() {
    return { findings: {}, areas: {}, markers: [] };
  }

  function createBlankState(reportId, reviewVersion) {
    return {
      schemaVersion: 2,
      reportId: String(reportId),
      reviewVersion: Number(reviewVersion) || 1,
      draft: blankDraft(),
      revisions: [],
      workingUpdatedAt: null,
      lastFinalizedFingerprint: null,
    };
  }

  function normalizeMarker(marker, index) {
    const next = Object.assign({}, marker);
    next.id = String(next.id || next.uid || ('legacy-marker-' + (index + 1)));
    next.nr = Number(next.nr) || index + 1;
    next.comment = String(next.comment || '');
    return next;
  }

  function normalizeFeedbackState(input, reportId, reviewVersion) {
    if (!input || typeof input !== 'object') return createBlankState(reportId, reviewVersion);
    if (input.schemaVersion === 2) {
      const state = createBlankState(input.reportId || reportId, input.reviewVersion || reviewVersion);
      state.draft = Object.assign(blankDraft(), deepClone(input.draft || {}));
      state.draft.findings = state.draft.findings || {};
      state.draft.areas = state.draft.areas || {};
      state.draft.markers = (state.draft.markers || []).map(normalizeMarker);
      state.revisions = Array.isArray(input.revisions) ? deepClone(input.revisions) : [];
      state.workingUpdatedAt = input.workingUpdatedAt || null;
      state.lastFinalizedFingerprint = input.lastFinalizedFingerprint || null;
      return state;
    }
    if (input.schema === 1 || input.findings || input.areas || input.markers) {
      const state = createBlankState(reportId, input.reviewVersion || reviewVersion);
      state.draft = {
        findings: deepClone(input.findings || {}),
        areas: deepClone(input.areas || {}),
        markers: (deepClone(input.markers || [])).map(normalizeMarker),
      };
      state.importedFromSchema = 1;
      return state;
    }
    return createBlankState(reportId, reviewVersion);
  }

  function pointerEscape(value) {
    return String(value).replace(/~/g, '~0').replace(/\//g, '~1');
  }

  function pointerUnescape(value) {
    return String(value).replace(/~1/g, '/').replace(/~0/g, '~');
  }

  function buildOperations(previous, current, path, operations) {
    const aObject = previous !== null && typeof previous === 'object';
    const bObject = current !== null && typeof current === 'object';
    if (Array.isArray(previous) || Array.isArray(current)) {
      if (stableStringify(previous) !== stableStringify(current)) operations.push({ op: 'set', path: path || '/', value: deepClone(current) });
      return;
    }
    if (!aObject || !bObject) {
      if (stableStringify(previous) !== stableStringify(current)) operations.push({ op: 'set', path: path || '/', value: deepClone(current) });
      return;
    }
    const keys = Array.from(new Set(Object.keys(previous).concat(Object.keys(current)))).sort();
    keys.forEach((key) => {
      const childPath = (path || '') + '/' + pointerEscape(key);
      if (!Object.prototype.hasOwnProperty.call(current, key)) operations.push({ op: 'delete', path: childPath });
      else if (!Object.prototype.hasOwnProperty.call(previous, key)) operations.push({ op: 'set', path: childPath, value: deepClone(current[key]) });
      else buildOperations(previous[key], current[key], childPath, operations);
    });
  }

  function changedKeys(previous, current) {
    const a = previous || {};
    const b = current || {};
    const changed = [];
    let unchanged = 0;
    Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort().forEach((key) => {
      if (hashValue(a[key]) === hashValue(b[key])) unchanged += 1;
      else changed.push(key);
    });
    return { changed, unchanged };
  }

  function diffFeedback(previous, current) {
    const before = Object.assign(blankDraft(), deepClone(previous || {}));
    const after = Object.assign(blankDraft(), deepClone(current || {}));
    const operations = [];
    buildOperations(before, after, '', operations);
    const findings = changedKeys(before.findings, after.findings);
    const areas = changedKeys(before.areas, after.areas);
    const oldMarkers = {};
    const newMarkers = {};
    (before.markers || []).forEach((marker) => { oldMarkers[String(marker.id || marker.uid)] = marker; });
    (after.markers || []).forEach((marker) => { newMarkers[String(marker.id || marker.uid)] = marker; });
    const markers = changedKeys(oldMarkers, newMarkers);
    return {
      operations,
      changedFindingIds: findings.changed,
      unchangedFindingCount: findings.unchanged,
      changedAreaIds: areas.changed,
      unchangedAreaCount: areas.unchanged,
      changedMarkerIds: markers.changed,
      unchangedMarkerCount: markers.unchanged,
      changedPathCount: operations.length,
    };
  }

  function applyOperations(base, operations) {
    let output = deepClone(base);
    (operations || []).forEach((operation) => {
      if (operation.path === '/' || operation.path === '') {
        output = operation.op === 'delete' ? undefined : deepClone(operation.value);
        return;
      }
      const parts = operation.path.split('/').slice(1).map(pointerUnescape);
      let cursor = output;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
        cursor = cursor[key];
      }
      const leaf = parts[parts.length - 1];
      if (operation.op === 'delete') delete cursor[leaf];
      else cursor[leaf] = deepClone(operation.value);
    });
    return output;
  }

  function flattenFindings(review) {
    const output = {};
    (review && review.areas || []).forEach((area) => {
      (area.findings || []).forEach((finding) => { output[finding.id] = finding; });
    });
    return output;
  }

  function findingFingerprint(finding) {
    if (!finding) return null;
    return hashValue({
      id: finding.id,
      severity: finding.severity,
      title: finding.title,
      detail: finding.detail,
      ref: finding.ref,
      imageIds: finding.imageIds || [],
      suggestions: finding.suggestions || [],
    });
  }

  function diffReviewVersions(previousReview, currentReview) {
    const previous = flattenFindings(previousReview);
    const current = flattenFindings(currentReview);
    const byFindingId = {};
    const counts = { new: 0, changed: 0, unchanged: 0, removed: 0 };
    Array.from(new Set(Object.keys(previous).concat(Object.keys(current)))).sort().forEach((id) => {
      let status;
      if (!previous[id]) status = 'new';
      else if (!current[id]) status = 'removed';
      else if (findingFingerprint(previous[id]) !== findingFingerprint(current[id])) status = 'changed';
      else status = 'unchanged';
      byFindingId[id] = status;
      counts[status] += 1;
    });
    return { byFindingId, counts };
  }

  function buildActionSummary(review, fullState, delta) {
    const findingsById = flattenFindings(review);
    const acceptedFindings = [];
    const rejectedFindings = [];
    const acceptedSuggestions = [];
    const rejectedSuggestions = [];
    const customComments = [];
    Object.keys(fullState.findings || {}).sort().forEach((findingId) => {
      const state = fullState.findings[findingId] || {};
      const finding = findingsById[findingId] || {};
      if (state.decision === 'accept') acceptedFindings.push({ findingId, title: finding.title || findingId });
      if (state.decision === 'reject') rejectedFindings.push({ findingId, title: finding.title || findingId });
      if ((state.comment || '').trim()) customComments.push({ scope: 'finding', findingId, comment: state.comment.trim() });
      Object.keys(state.suggestions || {}).sort().forEach((suggestionId) => {
        const suggestionState = state.suggestions[suggestionId] || {};
        const suggestion = (finding.suggestions || []).find((item) => item.id === suggestionId) || {};
        const item = {
          findingId,
          suggestionId,
          findingTitle: finding.title || findingId,
          title: suggestion.title || suggestionId,
          recommendation: suggestion.note || '',
          acceptanceCriteria: suggestion.acceptanceCriteria || finding.acceptanceCriteria || '',
          comment: (suggestionState.comment || '').trim(),
        };
        if (suggestionState.decision === 'accept') acceptedSuggestions.push(item);
        if (suggestionState.decision === 'reject') rejectedSuggestions.push(item);
        if (item.comment) customComments.push({ scope: 'suggestion', findingId, suggestionId, comment: item.comment });
      });
    });
    const acceptedAreaSuggestions = [];
    const rejectedAreaSuggestions = [];
    const areasById = {};
    (review && review.areas || []).forEach((area) => { areasById[area.id] = area; });
    const areaComments = [];
    Object.keys(fullState.areas || {}).sort().forEach((areaId) => {
      const areaState = fullState.areas[areaId] || {};
      const area = areasById[areaId] || {};
      const areaComment = String(areaState.comment || '').trim();
      if (areaComment) areaComments.push({ areaId, areaTitle: area.tab || areaId, comment: areaComment });
      Object.keys(areaState.suggestions || {}).sort().forEach((suggestionId) => {
        const suggestionState = areaState.suggestions[suggestionId] || {};
        const suggestion = (area.suggestions || []).find((item) => item.id === suggestionId) || {};
        const item = {
          areaId,
          areaTitle: area.tab || areaId,
          suggestionId,
          title: suggestion.title || suggestionId,
          recommendation: suggestion.note || '',
          acceptanceCriteria: suggestion.acceptanceCriteria || '',
          comment: String(suggestionState.comment || '').trim(),
        };
        if (suggestionState.decision === 'accept') acceptedAreaSuggestions.push(item);
        if (suggestionState.decision === 'reject') rejectedAreaSuggestions.push(item);
      });
    });
    const markerComments = (fullState.markers || []).filter((marker) => String(marker.comment || '').trim()).map((marker) => deepClone(marker));
    return {
      acceptedFindings,
      rejectedFindings,
      acceptedSuggestions,
      rejectedSuggestions,
      acceptedAreaSuggestions,
      rejectedAreaSuggestions,
      customComments,
      areaComments,
      markerComments,
      changedFindingIds: (delta && delta.changedFindingIds) || [],
      changedAreaIds: (delta && delta.changedAreaIds) || [],
      changedMarkerIds: (delta && delta.changedMarkerIds) || [],
    };
  }

  function finalizeChangeRequest(inputState, review, options) {
    const state = normalizeFeedbackState(inputState, review.reportId, review.version);
    const current = deepClone(state.draft);
    const previousRevision = state.revisions.length ? state.revisions[state.revisions.length - 1] : null;
    const previous = previousRevision ? previousRevision.fullState : blankDraft();
    const delta = diffFeedback(previous, current);
    if (delta.operations.length === 0) return { created: false, reason: 'unchanged', state };
    const changeRequestVersion = previousRevision ? Number(previousRevision.changeRequestVersion) + 1 : 1;
    const payload = {
      schemaVersion: 2,
      kind: 'lifehub-review-change-request',
      reportId: state.reportId,
      reportTitle: review.title || state.reportId,
      reviewVersion: Number(review.version) || state.reviewVersion,
      reviewFingerprint: hashValue(review),
      changeRequestVersion,
      baseChangeRequestVersion: previousRevision ? Number(previousRevision.changeRequestVersion) : 0,
      exportedAt: options && options.exportedAt || new Date().toISOString(),
      fullState: current,
      deltaFromPrevious: delta,
      actionSummary: buildActionSummary(review, current, delta),
      agentInstructions: {
        latestTruth: 'fullState',
        useDeltaWhenImplementedVersionEquals: previousRevision ? Number(previousRevision.changeRequestVersion) : 0,
        otherwise: 'Use fullState because one or more prior change requests may not have been implemented.',
      },
    };
    state.revisions.push(deepClone(payload));
    state.lastFinalizedFingerprint = hashValue(current);
    state.workingUpdatedAt = payload.exportedAt;
    return { created: true, state, payload };
  }

  function selectImplementationScope(payload, implementedChangeRequestVersion) {
    const implemented = implementedChangeRequestVersion === null || implementedChangeRequestVersion === undefined ? null : Number(implementedChangeRequestVersion);
    if (payload && payload.baseChangeRequestVersion > 0 && implemented === Number(payload.baseChangeRequestVersion)) {
      return { mode: 'delta', data: payload.deltaFromPrevious, reason: 'The immediately preceding change request is already implemented.' };
    }
    return { mode: 'full', data: payload && payload.fullState, reason: 'Use the latest complete truth because prior implementation state is missing or not contiguous.' };
  }

  function nextMarkerNumber(markers, imageId) {
    return (markers || []).filter((marker) => marker.imageId === imageId).reduce((max, marker) => Math.max(max, Number(marker.nr) || 0), 0) + 1;
  }

  return {
    deepClone,
    stableStringify,
    hashValue,
    createBlankState,
    normalizeFeedbackState,
    diffFeedback,
    applyOperations,
    diffReviewVersions,
    buildActionSummary,
    finalizeChangeRequest,
    selectImplementationScope,
    nextMarkerNumber,
  };
});
