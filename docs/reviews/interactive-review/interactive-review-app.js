(function (root) {
  'use strict';
  const Core = root.ReviewStateCore;
  if (!Core) throw new Error('ReviewStateCore fehlt');

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function boot() {
    const versions = (root.REVIEW_VERSIONS || []).slice().sort((a, b) => a.version - b.version);
    if (!versions.length) throw new Error('REVIEW_VERSIONS ist leer');
    const latestReview = versions[versions.length - 1];
    let review = latestReview;
    const storageKey = latestReview.storageKey || ('lifehub-interactive-review:' + latestReview.reportId);
    let state = loadState();
    let activeArea = 'overview';
    let severityFilter = '';
    let decisionFilter = '';
    let searchFilter = '';
    let diffOnly = false;
    let snapshotVersion = null;
    let saveTimer = null;
    let pendingPayload = null;
    let lightboxContext = null;
    let annotationTool = null;
    let annotationColor = '#ff4d6d';
    let drawing = null;

    const $ = (selector) => document.querySelector(selector);
    const byId = (id) => document.getElementById(id);

    function loadState() {
      try {
        const raw = localStorage.getItem(storageKey);
        return Core.normalizeFeedbackState(raw ? JSON.parse(raw) : null, latestReview.reportId, latestReview.version);
      } catch (error) {
        console.warn('Review-State konnte nicht geladen werden', error);
        return Core.createBlankState(latestReview.reportId, latestReview.version);
      }
    }

    function persist(immediate) {
      if (isReadOnly()) return;
      const write = () => {
        state.workingUpdatedAt = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify(state));
        const badge = byId('savedBadge');
        badge.classList.add('on');
        setTimeout(() => badge.classList.remove('on'), 900);
      };
      clearTimeout(saveTimer);
      if (immediate) write();
      else saveTimer = setTimeout(write, 180);
    }

    function currentRevision() {
      return snapshotVersion == null ? null : state.revisions.find((item) => Number(item.changeRequestVersion) === Number(snapshotVersion));
    }

    function currentFeedback() {
      const revision = currentRevision();
      return revision ? revision.fullState : state.draft;
    }

    function isHistoricalReview() {
      return Number(review.version) !== Number(latestReview.version);
    }

    function isReadOnly() {
      return snapshotVersion != null || isHistoricalReview();
    }

    function flattenFindings(sourceReview) {
      const output = [];
      (sourceReview.areas || []).forEach((area) => (area.findings || []).forEach((finding) => output.push({ ...finding, areaId: area.id, areaTab: area.tab })));
      return output;
    }

    function findingById(id) {
      return flattenFindings(review).find((finding) => finding.id === id);
    }

    function areaById(id) {
      return (review.areas || []).find((area) => area.id === id);
    }

    function ensureFindingState(id) {
      if (!state.draft.findings[id]) state.draft.findings[id] = { decision: 'none', comment: '', opened: false, suggestions: {} };
      const item = state.draft.findings[id];
      if (!item.suggestions) item.suggestions = {};
      return item;
    }

    function ensureSuggestionState(findingId, suggestionId) {
      const finding = ensureFindingState(findingId);
      if (!finding.suggestions[suggestionId]) finding.suggestions[suggestionId] = { decision: 'none', comment: '' };
      return finding.suggestions[suggestionId];
    }

    function ensureAreaState(areaId) {
      if (!state.draft.areas[areaId]) state.draft.areas[areaId] = { comment: '', suggestions: {} };
      if (!state.draft.areas[areaId].suggestions) state.draft.areas[areaId].suggestions = {};
      return state.draft.areas[areaId];
    }

    function ensureAreaSuggestionState(areaId, suggestionId) {
      const area = ensureAreaState(areaId);
      if (!area.suggestions[suggestionId]) area.suggestions[suggestionId] = { decision: 'none', comment: '' };
      return area.suggestions[suggestionId];
    }

    function findingStateFrom(feedback, id) {
      return (feedback.findings || {})[id] || { decision: 'none', comment: '', suggestions: {} };
    }

    function areaStateFrom(feedback, id) {
      return (feedback.areas || {})[id] || { comment: '', suggestions: {} };
    }

    function allImages() {
      const map = {};
      (review.areas || []).forEach((area) => (area.images || []).forEach((image) => { map[image.id] = { ...image, areaId: area.id }; }));
      return map;
    }

    function previousReview() {
      const index = versions.findIndex((item) => Number(item.version) === Number(review.version));
      return index > 0 ? versions[index - 1] : null;
    }

    function reviewDiff() {
      const previous = previousReview();
      return previous ? Core.diffReviewVersions(previous, review) : null;
    }

    function diffStatus(findingId) {
      const diff = reviewDiff();
      return diff ? diff.byFindingId[findingId] || 'new' : null;
    }

    function decisionStatus(finding, feedback) {
      const item = findingStateFrom(feedback, finding.id);
      const suggestionStates = Object.values(item.suggestions || {});
      if (item.decision === 'accept' || suggestionStates.some((value) => value.decision === 'accept')) return 'accepted';
      if (item.decision === 'reject' || suggestionStates.some((value) => value.decision === 'reject')) return 'rejected';
      if ((item.comment || '').trim() || suggestionStates.some((value) => (value.comment || '').trim() || value.decision === 'comment')) return 'commented';
      return 'undecided';
    }

    function findingMatches(finding, feedback) {
      if (severityFilter && finding.severity !== severityFilter) return false;
      if (decisionFilter && decisionStatus(finding, feedback) !== decisionFilter) return false;
      if (searchFilter) {
        const haystack = [finding.id, finding.title, finding.detail, finding.ref, finding.impact, finding.rootCause]
          .concat((finding.suggestions || []).flatMap((suggestion) => [suggestion.title, suggestion.note, suggestion.acceptanceCriteria]))
          .join(' ').toLowerCase();
        if (!haystack.includes(searchFilter.toLowerCase())) return false;
      }
      if (diffOnly) {
        const status = diffStatus(finding.id);
        if (!['new', 'changed'].includes(status)) return false;
      }
      return true;
    }

    function reviewStats() {
      const findings = flattenFindings(review);
      const result = { P0: 0, P1: 0, P2: 0, P3: 0 };
      findings.forEach((finding) => { if (Object.prototype.hasOwnProperty.call(result, finding.severity)) result[finding.severity] += 1; });
      return result;
    }

    function feedbackProgress(feedback) {
      const findings = flattenFindings(review);
      let decided = 0;
      findings.forEach((finding) => {
        const item = findingStateFrom(feedback, finding.id);
        const suggestions = Object.values(item.suggestions || {});
        if (item.decision !== 'none' || (item.comment || '').trim() || suggestions.some((value) => value.decision !== 'none' || (value.comment || '').trim())) decided += 1;
      });
      return { total: findings.length, decided, percent: Math.round((decided / Math.max(findings.length, 1)) * 100) };
    }

    function renderHeader() {
      byId('reportTitle').textContent = review.title;
      byId('reportSubtitle').textContent = review.subtitle || '';
      byId('metaLine').textContent = `${review.date} · Review R${review.version} · ${(review.areas || []).length} Bereiche · Kommentare und Marker werden lokal gespeichert`;
      const selector = byId('reviewVersionSelect');
      selector.innerHTML = versions.map((item) => `<option value="${item.version}" ${item.version === review.version ? 'selected' : ''}>Review R${item.version} · ${esc(item.date)}</option>`).join('');
      const diffButton = byId('diffToggle');
      diffButton.disabled = !previousReview();
      diffButton.classList.toggle('success', diffOnly);
      diffButton.title = previousReview() ? `Änderungen gegenüber Review R${previousReview().version}` : 'Noch keine Vorgängerversion vorhanden';
      byId('finishBtn').disabled = isReadOnly();
      byId('draftExportBtn').disabled = isReadOnly();
    }

    function renderTimeline() {
      const reviewItems = versions.map((item) => `<button class="timeline-item ${Number(item.version) === Number(review.version) && snapshotVersion == null ? 'on' : ''}" data-review-version="${item.version}">Review R${item.version}<small>${esc(item.date)} · ${esc(item.title)}</small></button>`).join('');
      const revisionItems = state.revisions.length
        ? state.revisions.slice().reverse().map((item) => `<button class="timeline-item ${Number(item.changeRequestVersion) === Number(snapshotVersion) ? 'on' : ''}" data-revision="${item.changeRequestVersion}">Änderungsanforderung v${item.changeRequestVersion}<span class="count">${item.deltaFromPrevious.changedPathCount}</span><small>${esc(item.exportedAt || '')} · ${item.deltaFromPrevious.changedFindingIds.length} Findings geändert</small></button>`).join('')
        : '<div class="timeline-empty">Noch keine abgeschlossene Änderungsanforderung.</div>';
      byId('timeline').innerHTML = `<h2>Reviews</h2>${reviewItems}<h2>Änderungen</h2><button class="timeline-item ${snapshotVersion == null && Number(review.version) === Number(latestReview.version) ? 'on' : ''}" data-draft>Aktueller Entwurf<small>automatisch gespeichert</small></button>${revisionItems}`;
    }

    function renderStats() {
      const stats = reviewStats();
      byId('stats').innerHTML = ['P0', 'P1', 'P2', 'P3'].map((severity) => `<button class="stat s-${severity} ${severityFilter === severity ? 'on' : ''}" data-severity="${severity}"><b>${stats[severity]}</b><small>${severity === 'P0' ? 'Blocker' : severity === 'P1' ? 'Kritisch' : severity === 'P2' ? 'Wichtig' : 'Politur'}</small></button>`).join('') + `<button class="stat ${!severityFilter ? 'on' : ''}" data-severity=""><b>↺</b><small>Alle</small></button>`;
    }

    function renderTabs() {
      const diff = reviewDiff();
      const tabs = [{ id: 'overview', tab: 'Überblick' }].concat(review.areas || []);
      byId('tabs').innerHTML = tabs.map((area) => {
        const count = area.id === 'overview' || !diff ? 0 : (area.findings || []).filter((finding) => ['new', 'changed'].includes(diff.byFindingId[finding.id])).length;
        return `<button class="tab ${activeArea === area.id ? 'on' : ''}" role="tab" aria-selected="${activeArea === area.id}" data-area="${area.id}">${esc(area.tab)}${diffOnly && count ? `<span class="chg">${count}</span>` : ''}</button>`;
      }).join('');
    }

    function renderFilters() {
      byId('decisionFilter').value = decisionFilter;
      byId('searchFilter').value = searchFilter;
      byId('diffOnlyLabel').textContent = diffOnly ? 'Nur Änderungen: an' : 'Nur Änderungen';
    }

    function renderSnapshotBanner() {
      const banner = byId('snapshotBanner');
      const revision = currentRevision();
      if (revision) {
        banner.classList.add('on');
        banner.innerHTML = `<strong>Historische Änderungsanforderung v${revision.changeRequestVersion}</strong><span>Read-only · ${esc(revision.exportedAt || '')}</span><span class="spacer"></span><button class="btn" data-draft>Zurück zum Entwurf</button>`;
      } else if (isHistoricalReview()) {
        banner.classList.add('on');
        banner.innerHTML = `<strong>Historisches Review R${review.version}</strong><span>Read-only</span><span class="spacer"></span><button class="btn" data-review-version="${latestReview.version}">Aktuelles Review öffnen</button>`;
      } else {
        banner.classList.remove('on');
        banner.innerHTML = '';
      }
      document.body.classList.toggle('readonly', isReadOnly());
    }

    function areaSuggestionHtml(area, feedback) {
      if (!(area.suggestions || []).length) return '';
      const areaState = areaStateFrom(feedback, area.id);
      return (area.suggestions || []).map((suggestion) => {
        const stateItem = (areaState.suggestions || {})[suggestion.id] || { decision: 'none', comment: '' };
        return suggestionHtml({ scope: 'area', areaId: area.id, suggestion, stateItem });
      }).join('');
    }

    function suggestionHtml({ scope, areaId, findingId, suggestion, stateItem }) {
      const prefix = scope === 'area' ? `data-area-id="${esc(areaId)}"` : `data-finding-id="${esc(findingId)}"`;
      return `<div class="suggestion" data-editable data-suggestion-card data-scope="${scope}" ${prefix} data-suggestion-id="${esc(suggestion.id)}">
        <h4>${esc(suggestion.title)}</h4><p>${esc(suggestion.note || '')}</p>
        ${suggestion.acceptanceCriteria ? `<div class="acceptance"><b>Akzeptanz:</b> ${esc(suggestion.acceptanceCriteria)}</div>` : ''}
        <div class="decision-row">
          <button class="decision accept ${stateItem.decision === 'accept' ? 'on' : ''}" data-decision="accept">✓ Übernehmen</button>
          <button class="decision reject ${stateItem.decision === 'reject' ? 'on' : ''}" data-decision="reject">✕ Ablehnen</button>
          <button class="decision comment ${stateItem.decision === 'comment' ? 'on' : ''}" data-decision="comment">💬 Anders/Kommentar</button>
        </div>
        ${stateItem.decision === 'comment' ? `<textarea class="textarea" data-suggestion-comment placeholder="Wie soll dieser Fix stattdessen aussehen?">${esc(stateItem.comment || '')}</textarea>` : ''}
      </div>`;
    }

    function markerSummaryHtml(imageId, feedback) {
      const markers = (feedback.markers || []).filter((marker) => marker.imageId === imageId);
      if (!markers.length) return '<div class="marker-summary">Keine Markierungen</div>';
      return `<div class="marker-summary">${markers.map((marker) => `<button data-open-image="${esc(imageId)}">● Markierung ${marker.nr}${marker.comment ? ': ' + esc(marker.comment.slice(0, 50)) : ''}</button>`).join(' · ')}</div>`;
    }

    function findingHtml(finding, feedback) {
      const item = findingStateFrom(feedback, finding.id);
      const diff = diffStatus(finding.id);
      const imageMap = allImages();
      const images = (finding.imageIds || []).map((id) => imageMap[id]).filter(Boolean);
      const open = !!item.opened;
      const diffChip = diff && diff !== 'unchanged' ? `<span class="diff-chip">${diff === 'new' ? 'NEU' : diff === 'changed' ? 'Geändert' : 'Entfernt'}</span>` : '';
      const imagesHtml = images.length ? `<div class="shots">${images.map((image) => `<figure class="shot-wrap"><img class="thumb" src="${image.thumb || image.src}" alt="${esc(image.cap || finding.title)}"><button class="zoom" data-open-image="${esc(image.id)}" data-finding-id="${esc(finding.id)}" aria-label="Bild vergrößern und markieren">⌕</button><figcaption>${esc(image.cap || '')}</figcaption>${markerSummaryHtml(image.id, feedback)}</figure>`).join('')}</div>` : '';
      const suggestions = (finding.suggestions || []).map((suggestion) => suggestionHtml({ scope: 'finding', findingId: finding.id, suggestion, stateItem: (item.suggestions || {})[suggestion.id] || { decision: 'none', comment: '' } })).join('');
      return `<article class="finding ${esc(finding.severity)} ${open ? 'open' : ''} ${diff || ''}" data-finding="${esc(finding.id)}">
        <button class="finding-head" data-toggle-finding="${esc(finding.id)}" aria-expanded="${open}"><span class="sev ${esc(finding.severity)}">${esc(finding.severity)}</span><span class="finding-title">${esc(finding.title)}${diffChip}<span class="finding-id">${esc(finding.id)} · ${esc(finding.category || '')}</span></span><span class="chev">▸</span></button>
        <div class="finding-body"><div class="detail-grid"><div><div class="detail">${esc(finding.detail || '')}</div><div class="evidence">${esc(finding.ref || '')}</div></div>${imagesHtml || '<div></div>'}</div>
          ${suggestions}
          <label class="comment-label">💬 Kommentar zu diesem Finding</label><textarea class="textarea" data-editable data-finding-comment="${esc(finding.id)}" placeholder="Was soll geändert oder berücksichtigt werden?">${esc(item.comment || '')}</textarea>
        </div>
      </article>`;
    }

    function overviewHtml(feedback) {
      const progress = feedbackProgress(feedback);
      const topFindings = flattenFindings(review).filter((finding) => ['P0', 'P1'].includes(finding.severity) && findingMatches(finding, feedback)).slice(0, 12);
      const diff = reviewDiff();
      return `<h2 class="area-title">Überblick</h2><div class="area-sub">${esc(review.intro || '')}</div>
        <div class="progress-card"><b>${progress.decided} von ${progress.total} Findings bearbeitet</b><div class="progress-line"><i style="width:${progress.percent}%"></i></div></div>
        <div class="area-comment" data-editable><label>💬 Allgemeiner Kommentar zum gesamten Review</label><textarea class="textarea" data-area-comment="__overview" placeholder="Übergreifende Änderungswünsche …">${esc(areaStateFrom(feedback, '__overview').comment || '')}</textarea></div>
        <div class="overview-grid">${(review.areas || []).map((area) => `<button class="overview-card" data-area="${esc(area.id)}"><h3>${esc(area.tab)}</h3><p>${(area.findings || []).length} Findings · ${esc(area.score || '')}</p></button>`).join('')}</div>
        ${diffOnly && diff ? `<div class="area-intro"><b>Review-Diff:</b> ${diff.counts.new} neu · ${diff.counts.changed} geändert · ${diff.counts.unchanged} unverändert · ${diff.counts.removed} entfernt</div>` : ''}
        <h2 class="area-title">Kritische Punkte</h2>${topFindings.length ? topFindings.map((finding) => findingHtml(finding, feedback)).join('') : '<div class="empty">Keine Findings für den aktuellen Filter.</div>'}`;
    }

    function areaGalleryHtml(area, feedback) {
      if (!(area.images || []).length) return '';
      return `<h3>Display-/Tab-Galerie <span class="finding-id">${area.images.length} Screenshots</span></h3><div class="shots">${area.images.map((image) => `<figure class="shot-wrap"><img class="thumb" src="${image.thumb || image.src}" alt="${esc(image.cap || area.tab)}"><button class="zoom" data-open-image="${esc(image.id)}" aria-label="${esc(image.cap || 'Bild')} vergrößern und markieren">⌕</button><figcaption>${esc(image.cap || '')}</figcaption>${markerSummaryHtml(image.id, feedback)}</figure>`).join('')}</div>`;
    }

    function areaHtml(area, feedback) {
      const findings = (area.findings || []).filter((finding) => findingMatches(finding, feedback));
      const areaState = areaStateFrom(feedback, area.id);
      return `<h2 class="area-title">${esc(area.tab)}</h2><div class="area-sub">${area.vorbild ? 'Referenz: ' + esc(area.vorbild) + ' · ' : ''}${esc(area.score || '')}</div>
        ${area.general ? `<div class="area-intro"><b>Stärken:</b> ${esc(area.general)}</div>` : ''}
        <div class="area-comment" data-editable><label>💬 Allgemeiner Kommentar zu ${esc(area.tab)}</label><textarea class="textarea" data-area-comment="${esc(area.id)}" placeholder="Übergreifende Anmerkungen zu diesem Bereich …">${esc(areaState.comment || '')}</textarea></div>
        ${areaSuggestionHtml(area, feedback)}
        ${areaGalleryHtml(area, feedback)}
        ${findings.length ? findings.map((finding) => findingHtml(finding, feedback)).join('') : '<div class="empty">Keine Einträge für den aktuellen Filter.</div>'}`;
    }

    function renderMain() {
      const feedback = currentFeedback();
      const main = byId('main');
      main.innerHTML = activeArea === 'overview' ? overviewHtml(feedback) : areaHtml(areaById(activeArea), feedback);
      const progress = feedbackProgress(feedback);
      byId('footerProgress').style.width = progress.percent + '%';
      byId('footerProgressText').textContent = `${progress.decided}/${progress.total} Findings bearbeitet`;
    }

    function renderAll() {
      renderHeader();
      renderTimeline();
      renderStats();
      renderTabs();
      renderFilters();
      renderSnapshotBanner();
      renderMain();
    }

    function toggleDecision(button) {
      if (isReadOnly()) return;
      const card = button.closest('[data-suggestion-card]');
      const scope = card.dataset.scope;
      const suggestionId = card.dataset.suggestionId;
      const decision = button.dataset.decision;
      let item;
      if (scope === 'area') item = ensureAreaSuggestionState(card.dataset.areaId, suggestionId);
      else item = ensureSuggestionState(card.dataset.findingId, suggestionId);
      item.decision = item.decision === decision ? 'none' : decision;
      persist();
      renderAll();
    }

    byId('app').addEventListener('click', (event) => {
      const reviewButton = event.target.closest('[data-review-version]');
      if (reviewButton) {
        review = versions.find((item) => Number(item.version) === Number(reviewButton.dataset.reviewVersion)) || latestReview;
        snapshotVersion = null; activeArea = 'overview'; diffOnly = false; renderAll(); return;
      }
      const revisionButton = event.target.closest('[data-revision]');
      if (revisionButton) { review = latestReview; snapshotVersion = Number(revisionButton.dataset.revision); activeArea = 'overview'; renderAll(); return; }
      if (event.target.closest('[data-draft]')) { review = latestReview; snapshotVersion = null; activeArea = 'overview'; renderAll(); return; }
      const areaButton = event.target.closest('[data-area]');
      if (areaButton) { activeArea = areaButton.dataset.area; renderTabs(); renderMain(); window.scrollTo({ top: 0 }); return; }
      const severityButton = event.target.closest('[data-severity]');
      if (severityButton) { severityFilter = severityFilter === severityButton.dataset.severity ? '' : severityButton.dataset.severity; renderStats(); renderMain(); return; }
      const toggle = event.target.closest('[data-toggle-finding]');
      if (toggle) {
        if (isReadOnly()) {
          const article = toggle.closest('.finding'); article.classList.toggle('open'); toggle.setAttribute('aria-expanded', article.classList.contains('open')); return;
        }
        const item = ensureFindingState(toggle.dataset.toggleFinding); item.opened = !item.opened; persist(); renderMain(); return;
      }
      const decision = event.target.closest('[data-decision]');
      if (decision) { toggleDecision(decision); return; }
      const imageButton = event.target.closest('[data-open-image]');
      if (imageButton) { openLightbox(imageButton.dataset.openImage, imageButton.dataset.findingId || null); return; }
    });

    byId('main').addEventListener('input', (event) => {
      if (isReadOnly()) return;
      const target = event.target;
      if (target.matches('[data-finding-comment]')) ensureFindingState(target.dataset.findingComment).comment = target.value;
      else if (target.matches('[data-area-comment]')) ensureAreaState(target.dataset.areaComment).comment = target.value;
      else if (target.matches('[data-suggestion-comment]')) {
        const card = target.closest('[data-suggestion-card]');
        const item = card.dataset.scope === 'area' ? ensureAreaSuggestionState(card.dataset.areaId, card.dataset.suggestionId) : ensureSuggestionState(card.dataset.findingId, card.dataset.suggestionId);
        item.comment = target.value;
      }
      persist();
    });

    byId('reviewVersionSelect').addEventListener('change', (event) => {
      review = versions.find((item) => Number(item.version) === Number(event.target.value)) || latestReview;
      snapshotVersion = null; activeArea = 'overview'; diffOnly = false; renderAll();
    });
    byId('decisionFilter').addEventListener('change', (event) => { decisionFilter = event.target.value; renderMain(); });
    byId('searchFilter').addEventListener('input', (event) => { searchFilter = event.target.value; renderMain(); });
    byId('diffToggle').addEventListener('click', () => { if (!previousReview()) return; diffOnly = !diffOnly; renderAll(); });
    byId('diffOnlyButton').addEventListener('click', () => { if (!previousReview()) return; diffOnly = !diffOnly; renderAll(); });

    function openLightbox(imageId, findingId) {
      const image = allImages()[imageId];
      if (!image) return;
      lightboxContext = { imageId, findingId, areaId: image.areaId };
      byId('lightboxImage').src = image.src;
      byId('lightboxTitle').textContent = image.cap || imageId;
      byId('lightbox').classList.add('on');
      byId('lightbox').setAttribute('aria-hidden', 'false');
      byId('lightboxImage').onload = () => { sizeOverlay(); drawMarkers(); };
      sizeOverlay(); drawMarkers();
    }

    function closeLightbox() {
      byId('lightbox').classList.remove('on');
      byId('lightbox').setAttribute('aria-hidden', 'true');
      lightboxContext = null; drawing = null; renderMain();
    }

    function sizeOverlay() {
      const image = byId('lightboxImage');
      const overlay = byId('annotationOverlay');
      const width = Math.max(image.clientWidth, 1), height = Math.max(image.clientHeight, 1);
      overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    function relativePoint(event) {
      const rect = byId('annotationOverlay').getBoundingClientRect();
      return {
        x: Math.min(Math.max((event.clientX - rect.left) / Math.max(rect.width, 1), 0), 1),
        y: Math.min(Math.max((event.clientY - rect.top) / Math.max(rect.height, 1), 0), 1),
      };
    }

    function markerSvg(marker, live) {
      const overlay = byId('annotationOverlay');
      const box = overlay.viewBox.baseVal;
      const x = marker.x * box.width, y = marker.y * box.height, width = marker.w * box.width, height = marker.h * box.height;
      const stroke = `stroke="${marker.color}" stroke-width="3" fill="none" ${live ? 'stroke-dasharray="6 4"' : ''}`;
      const shape = marker.type === 'ellipse'
        ? `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${Math.max(width / 2, 4)}" ry="${Math.max(height / 2, 4)}" ${stroke}/>`
        : `<rect x="${x}" y="${y}" width="${Math.max(width, 4)}" height="${Math.max(height, 4)}" rx="4" ${stroke}/>`;
      return `${shape}<circle cx="${x + 11}" cy="${y + 11}" r="11" fill="${marker.color}" stroke="#08090c" stroke-width="1"/><text x="${x + 11}" y="${y + 15}" text-anchor="middle" font-size="12" font-weight="800" fill="#08090c">${esc(marker.nr || '')}</text>`;
    }

    function lightboxMarkers() {
      return (currentFeedback().markers || []).filter((marker) => lightboxContext && marker.imageId === lightboxContext.imageId);
    }

    function drawMarkers() {
      if (!lightboxContext) return;
      const overlay = byId('annotationOverlay');
      overlay.innerHTML = lightboxMarkers().map((marker) => markerSvg(marker, false)).join('') + (drawing ? markerSvg({ ...drawing, nr: '' }, true) : '');
      renderMarkerPanel();
    }

    function renderMarkerPanel() {
      const panel = byId('markerPanel');
      const markers = lightboxMarkers();
      panel.innerHTML = `<h3>Markierungen – jede Nummer besitzt einen eigenen Kommentar</h3>${markers.length ? markers.map((marker) => `<div class="marker-row"><span class="marker-no" style="background:${marker.color}">${marker.nr}</span><textarea class="textarea" data-marker-comment="${esc(marker.id)}" placeholder="Kommentar zu Markierung ${marker.nr}">${esc(marker.comment || '')}</textarea><button class="marker-delete" data-marker-delete="${esc(marker.id)}" aria-label="Markierung ${marker.nr} löschen">🗑</button></div>`).join('') : '<div class="empty">Werkzeug Rechteck oder Kreis wählen und auf dem Bild ziehen.</div>'}`;
    }

    byId('annotationOverlay').addEventListener('pointerdown', (event) => {
      if (!annotationTool || isReadOnly() || !lightboxContext) return;
      const point = relativePoint(event);
      drawing = { type: annotationTool, x: point.x, y: point.y, w: 0, h: 0, color: annotationColor };
      byId('annotationOverlay').setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    byId('annotationOverlay').addEventListener('pointermove', (event) => {
      if (!drawing) return;
      const point = relativePoint(event);
      drawing.w = point.x - drawing.x; drawing.h = point.y - drawing.y; drawMarkers();
    });
    byId('annotationOverlay').addEventListener('pointerup', (event) => {
      if (!drawing || isReadOnly()) return;
      const point = relativePoint(event);
      const x2 = point.x, y2 = point.y;
      const marker = {
        id: `mk-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        imageId: lightboxContext.imageId,
        findingId: lightboxContext.findingId,
        areaId: lightboxContext.areaId,
        type: drawing.type,
        x: Math.min(drawing.x, x2), y: Math.min(drawing.y, y2),
        w: Math.abs(x2 - drawing.x), h: Math.abs(y2 - drawing.y),
        color: drawing.color,
        nr: Core.nextMarkerNumber(state.draft.markers, lightboxContext.imageId),
        comment: '',
      };
      drawing = null;
      if (marker.w < .01 && marker.h < .01) { drawMarkers(); return; }
      state.draft.markers.push(marker); persist(); drawMarkers();
    });

    byId('lightbox').addEventListener('click', (event) => {
      const tool = event.target.closest('[data-annotation-tool]');
      if (tool) {
        annotationTool = annotationTool === tool.dataset.annotationTool ? null : tool.dataset.annotationTool;
        document.querySelectorAll('[data-annotation-tool]').forEach((item) => item.classList.toggle('on', item.dataset.annotationTool === annotationTool));
        return;
      }
      const color = event.target.closest('[data-marker-color]');
      if (color) {
        annotationColor = color.dataset.markerColor;
        document.querySelectorAll('[data-marker-color]').forEach((item) => item.classList.toggle('on', item.dataset.markerColor === annotationColor));
        return;
      }
      const remove = event.target.closest('[data-marker-delete]');
      if (remove && !isReadOnly()) {
        state.draft.markers = state.draft.markers.filter((marker) => marker.id !== remove.dataset.markerDelete); persist(); drawMarkers(); return;
      }
      if (event.target.closest('[data-close-lightbox]')) closeLightbox();
      if (event.target.closest('[data-undo-marker]') && !isReadOnly()) {
        const markers = lightboxMarkers();
        if (markers.length) state.draft.markers = state.draft.markers.filter((marker) => marker.id !== markers[markers.length - 1].id);
        persist(); drawMarkers();
      }
    });
    byId('markerPanel').addEventListener('input', (event) => {
      if (isReadOnly()) return;
      const target = event.target.closest('[data-marker-comment]');
      if (!target) return;
      const marker = state.draft.markers.find((item) => item.id === target.dataset.markerComment);
      if (marker) { marker.comment = target.value; persist(); }
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && byId('lightbox').classList.contains('on')) closeLightbox(); });
    window.addEventListener('resize', () => { if (byId('lightbox').classList.contains('on')) { sizeOverlay(); drawMarkers(); } });

    function payloadFilename(payload) {
      return `${review.reportId}-fa-v${payload.changeRequestVersion}-${review.date}.json`;
    }

    function downloadJson(payload) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob); anchor.download = payloadFilename(payload); document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    }

    async function saveWithPicker(payload) {
      if (!root.showSaveFilePicker) { downloadJson(payload); return; }
      try {
        const handle = await root.showSaveFilePicker({ suggestedName: payloadFilename(payload), types: [{ description: 'LifeHub Review Feedback', accept: { 'application/json': ['.json'] } }] });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(payload, null, 2)); await writable.close();
      } catch (error) {
        if (error && error.name !== 'AbortError') alert('Speichern fehlgeschlagen: ' + error.message);
      }
    }

    function showFinalizeModal(payload, unchanged) {
      pendingPayload = payload || null;
      const modal = byId('finalizeModal'); modal.classList.add('on');
      if (unchanged) {
        byId('finalizeTitle').textContent = 'Keine neue Version nötig';
        byId('finalizeSummary').innerHTML = '<p>Seit der letzten Änderungsanforderung wurde nichts verändert.</p>';
        byId('savePickerBtn').classList.add('hidden'); byId('downloadBtn').classList.add('hidden');
        return;
      }
      const summary = payload.actionSummary;
      byId('finalizeTitle').textContent = `Änderungsanforderung v${payload.changeRequestVersion}`;
      byId('finalizeSummary').innerHTML = `<ul><li><b>${summary.acceptedSuggestions.length + summary.acceptedAreaSuggestions.length}</b> Fixes akzeptiert</li><li><b>${summary.rejectedSuggestions.length + summary.rejectedAreaSuggestions.length}</b> Fixes abgelehnt</li><li><b>${summary.customComments.length + summary.areaComments.length}</b> Kommentare</li><li><b>${summary.markerComments.length}</b> kommentierte Bildmarkierungen</li><li><b>${payload.deltaFromPrevious.changedFindingIds.length}</b> Findings gegenüber FA v${payload.baseChangeRequestVersion} geändert</li><li><b>${payload.deltaFromPrevious.unchangedFindingCount}</b> Findings unverändert</li></ul><p class="revision-summary">Die Datei enthält sowohl den vollständigen neuesten Zustand als auch das Delta zur Vorgängerversion.</p>`;
      byId('savePickerBtn').classList.remove('hidden'); byId('downloadBtn').classList.remove('hidden');
    }

    byId('finishBtn').addEventListener('click', () => {
      const result = Core.finalizeChangeRequest(state, review, { exportedAt: new Date().toISOString() });
      if (!result.created) { showFinalizeModal(null, true); return; }
      state = result.state; persist(true); renderTimeline(); showFinalizeModal(result.payload, false);
    });
    byId('savePickerBtn').addEventListener('click', async () => { if (pendingPayload) await saveWithPicker(pendingPayload); byId('finalizeModal').classList.remove('on'); });
    byId('downloadBtn').addEventListener('click', () => { if (pendingPayload) downloadJson(pendingPayload); byId('finalizeModal').classList.remove('on'); });
    byId('closeFinalizeBtn').addEventListener('click', () => byId('finalizeModal').classList.remove('on'));
    byId('draftExportBtn').addEventListener('click', () => downloadJson({ schemaVersion: 2, kind: 'lifehub-review-draft', reportId: review.reportId, reviewVersion: review.version, exportedAt: new Date().toISOString(), fullState: state.draft, revisions: state.revisions }));
    byId('importBtn').addEventListener('click', () => byId('importFile').click());
    byId('importFile').addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result);
          if (payload.reportId && payload.reportId !== latestReview.reportId) throw new Error('Diese Datei gehört zu einem anderen Review.');
          if (payload.schemaVersion === 2 && payload.kind === 'lifehub-review-change-request') {
            state.draft = Core.deepClone(payload.fullState);
            state.revisions = state.revisions.filter((item) => Number(item.changeRequestVersion) !== Number(payload.changeRequestVersion));
            state.revisions.push(Core.deepClone(payload)); state.revisions.sort((a, b) => a.changeRequestVersion - b.changeRequestVersion);
          } else if (payload.schemaVersion === 2 && payload.kind === 'lifehub-review-draft') {
            state.draft = Core.deepClone(payload.fullState); state.revisions = Core.deepClone(payload.revisions || state.revisions);
          } else {
            const migrated = Core.normalizeFeedbackState(payload, latestReview.reportId, latestReview.version);
            state.draft = migrated.draft;
          }
          persist(true); snapshotVersion = null; review = latestReview; renderAll(); alert('Feedback importiert ✓');
        } catch (error) { alert('Import fehlgeschlagen: ' + error.message); }
      };
      reader.readAsText(file); event.target.value = '';
    });

    root.InteractiveReviewTestAPI = {
      getState: () => Core.deepClone(state),
      getReview: () => Core.deepClone(review),
      setDraft: (draft) => { state.draft = Core.deepClone(draft); persist(true); renderAll(); },
      finalize: (at) => {
        const result = Core.finalizeChangeRequest(state, review, { exportedAt: at || new Date().toISOString() });
        if (result.created) { state = result.state; persist(true); renderAll(); }
        return Core.deepClone(result);
      },
      openImage: openLightbox,
      setArea: (id) => { activeArea = id; renderAll(); },
      setFilters: (filters) => { severityFilter = filters.severity || ''; decisionFilter = filters.decision || ''; searchFilter = filters.search || ''; renderAll(); },
      importPayload: (payload) => {
        if (payload.fullState) state.draft = Core.deepClone(payload.fullState);
        if (payload.changeRequestVersion) { state.revisions = state.revisions.filter((item) => item.changeRequestVersion !== payload.changeRequestVersion); state.revisions.push(Core.deepClone(payload)); state.revisions.sort((a, b) => a.changeRequestVersion - b.changeRequestVersion); }
        persist(true); renderAll();
      },
      reset: () => { localStorage.removeItem(storageKey); state = Core.createBlankState(latestReview.reportId, latestReview.version); review = latestReview; snapshotVersion = null; renderAll(); },
    };

    renderAll();
  }

  root.InteractiveReviewApp = { boot };
})(typeof globalThis !== 'undefined' ? globalThis : window);
