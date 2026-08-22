from __future__ import annotations

import base64
import csv
import io
import json
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
REVIEWS = ROOT / 'docs' / 'reviews'
TOOL_DIR = REVIEWS / 'interactive-review'
BACKLOG = REVIEWS / '2026-08-22_lifehub_prioritized_backlog.csv'
EVIDENCE = REVIEWS / 'evidence' / '2026-08-22-lifehub'
DATA_DIR = TOOL_DIR / 'data'

UI_OUTPUT = REVIEWS / '2026-08-22_lifehub_ui_design_review.html'
CODE_OUTPUT = REVIEWS / '2026-08-22_lifehub_code_functionality_review.html'


def read_backlog() -> list[dict[str, str]]:
    with BACKLOG.open(encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


UI_AREAS = [
    dict(id='dashboard', tab='Dashboard & Layout', vorbild='Modulares LifeHub-Dashboard', score='6,4 / 10', general='Die Dark-Mode-Basis und Widget-Karten sind visuell stark; Desktop-Raster und CTA-Hierarchie brauchen mehr Systematik.', suggestion='Raster, Widgetgrößen und primäre Aktionen als gemeinsamen Dashboard-Vertrag definieren.'),
    dict(id='responsive', tab='Mobile & Responsive', vorbild='Mobile-first Shell', score='3,8 / 10', general='Mobile Widgets stapeln grundsätzlich, aber Header, Tabs und Navigation brechen an mehreren Stellen.', suggestion='Bottom-Navigation, sichere Header-Inset-Zone und mobile Tab-/Sheet-Muster zentral umsetzen.'),
    dict(id='pages', tab='Pages UX', vorbild='Notion', score='4,5 / 10', general='Cover, Breadcrumbs und Versionierung sind gute Grundlagen; Interaktionen sind zu versteckt.', suggestion='Sichtbare Block-Affordanzen, semantische Navigation und eine ruhige Dokumentfläche priorisieren.'),
    dict(id='settings-errors', tab='Settings & Fehlerzustände', vorbild='System Settings / truthful states', score='4,2 / 10', general='Settings sind klar gegliedert; Fehler werden in mehreren Domains jedoch fälschlich als Empty State dargestellt.', suggestion='Error, Empty, Offline und Loading als eigene semantische Zustände standardisieren.'),
    dict(id='media', tab='Media & Rezepte', vorbild='Google Photos / hochwertige Content Cards', score='5,5 / 10', general='Media-/Recipe-Grids sind brauchbar, benötigen aber verlässliche Bild-Fallbacks und Größenverträge.', suggestion='Ein zentrales Thumbnail-/Fallback-System mit festen Seitenverhältnissen einführen.'),
    dict(id='accessibility', tab='Accessibility', vorbild='WCAG 2.2 AA', score='3,2 / 10', general='Ein globaler Fokus-Ring existiert; Namen, Labels, Kontrast und Touchziele sind noch nicht ausreichend.', suggestion='Accessible Names, Labels, 44px-Ziele und Kontrast als CI-Gates etablieren.'),
    dict(id='theming', tab='Theming & Glass', vorbild='LifeHub Refined · Apple Glass gezielt', score='4,9 / 10', general='Semantische Tokens und Akzentwahl existieren, werden aber von vielen statischen Farben umgangen.', suggestion='Surface-Theme, Akzentpalette, Dichte und Transparenz getrennt modellieren; Glass nur für Overlays.'),
]

CODE_AREAS = [
    dict(id='routing', tab='Live & Routing', vorbild='Fail-closed Routing/API Contracts', score='4 / 10', general='56 Routen wurden inventarisiert; Deep-Link-Hydration und Contract-Drift blockieren mehrere Bereiche.', suggestion='Zentralen AuthBoundary und generierten API-Client einführen.'),
    dict(id='domains', tab='Domains & Integrationen', vorbild='Vertikale, funktionsfähige Domain-Slices', score='3,5 / 10', general='Einige Domains sind visuell vorhanden, liefern live aber 500 oder falsche Empty States.', suggestion='Finance, Travel, Shopping und E-Mail als vollständige Recovery-Welle reparieren und E2E absichern.'),
    dict(id='pages-notion', tab='Pages / Notion', vorbild='Notion Block- und Datenbanksystem', score='3,5 / 10', general='Block-CRUD und Versionierung bilden ein Fundament; Notion-Parität und Block-Security fehlen.', suggestion='IDOR zuerst, danach kanonische Registry, Editor-Toolbar, Toggle/TOC und Datenbank-Vertical-Slice.'),
    dict(id='browser', tab='BrowserBlock', vorbild='Persistenter, isolierter Remote-Browser', score='2,5 / 10', general='Session/API/UI existieren; Cold Start, WebRTC, SSRF, Sandbox und Kapazitätsgrenzen sind kritisch.', suggestion='Browser bis zu Egress-Policy, Sandbox, Retry-State-Machine und Quotas als experimentell kennzeichnen.'),
    dict(id='jellyfin-music', tab='Jellyfin · Musik', vorbild='Spotify', score='5,2 / 10', general='Desktop-Routen, echte Wiedergabe sowie Now Playing/Lyrics/Queue funktionieren; Mobile, Artwork, Kontrast und Artist-ID-Vertrag sind kritisch.', suggestion='Route-, Tab-, Player-, Queue- und Detailzustände mit echten IDs als Regression-Suite sichern.'),
    dict(id='jellyfin-video', tab='Jellyfin · Filme & Serien', vorbild='Netflix', score='4,1 / 10', general='Home, Grid, Suche, Watchlists und reale Film-/Seriendetails sind umfangreich und visuell stark; der reale Filmplayer ist blockiert.', suggestion='Home, Browse, Detail, Staffel, Player, Watchlist und Search mit echten IDs und visuellen Snapshots absichern.'),
    dict(id='security', tab='Security', vorbild='Zero Trust / Secrets by design', score='2,1 / 10', general='Mehrere P0-Funde betreffen Zugangsdaten, Vault, Tokens, CORS und Dependencies.', suggestion='Credentials, Throttling, Vault-Kryptografie und Tokenhygiene vor Feature-Polish abschließen.'),
    dict(id='performance', tab='Performance', vorbild='Messbare Budgets', score='4,8 / 10', general='LAN-Navigation ist schnell, aber Bundle-, Bild-, DOM- und Browser-Renderer-Kosten sind hoch.', suggestion='Budgets für Bundle, DOM, Bilder, Queries und Browser-Sessions in CI messen.'),
    dict(id='tests', tab='Tests & Wartbarkeit', vorbild='Reproduzierbare Testpyramide', score='2,8 / 10', general='Typechecks/Builds sind grün; Backend-/Workspace-Tests vermitteln noch keine verlässliche Sicherheit.', suggestion='No-tests als Fehler behandeln, Package-Resolution reparieren und kritische E2E-Flows ergänzen.'),
    dict(id='docker', tab='Docker & Deployment', vorbild='Hermetische, immutable NAS-Releases', score='2,4 / 10', general='Compose ist syntaktisch valide, Images hängen aber von Host-Artefakten und fehler-toleranten Migrationen ab.', suggestion='Hermetische Multi-Stage-Builds, Fail-fast-Migration, non-root und immutable Releases umsetzen.'),
]


def ui_area_for(row: dict[str, str]) -> str:
    finding_id = row['ID']
    if finding_id in {'UI-008'}:
        return 'dashboard'
    if finding_id in {'UI-009', 'UI-010'}:
        return 'responsive'
    if finding_id in {'UI-011', 'UI-013', 'UI-016'}:
        return 'pages'
    if finding_id in {'UI-014', 'UI-017'}:
        return 'settings-errors'
    if finding_id in {'UI-015'}:
        return 'media'
    if finding_id in {'UI-002', 'UI-003', 'UI-012'}:
        return 'accessibility'
    return 'theming'


def code_area_for(row: dict[str, str]) -> str:
    finding_id = row['ID']
    if finding_id.startswith('JELM-'):
        return 'jellyfin-music'
    if finding_id.startswith('JELV-'):
        return 'jellyfin-video'
    if finding_id.startswith('PAGE-'):
        return 'pages-notion'
    if finding_id.startswith('BROW-'):
        return 'browser'
    if finding_id.startswith('SEC-'):
        return 'security'
    if finding_id.startswith('PERF-'):
        return 'performance'
    if finding_id.startswith('DOCKER-'):
        return 'docker'
    if finding_id.startswith('MAINT-') or finding_id == 'FUNC-009':
        return 'tests'
    if finding_id in {'FUNC-002', 'FUNC-003', 'FUNC-004', 'FUNC-005'}:
        return 'domains'
    return 'routing'


IMAGE_CONFIG: dict[str, list[tuple[str, str, str]]] = {
    'dashboard': [
        ('dashboard-desktop', 'screenshots/desktop-dark/dashboard__1440x1000__dark__default.png', 'Dashboard · Desktop Dark'),
        ('dashboard-mobile', 'screenshots/mobile/dashboard__375x812__dark.png', 'Dashboard · Mobile 375px'),
    ],
    'responsive': [
        ('mobile-pages', 'screenshots/mobile/pages__375x812__dark.png', 'Pages · Mobile – Headerüberlagerung'),
        ('mobile-settings', 'screenshots/mobile/settings__375x812__dark.png', 'Settings · Mobile – Tabs/Overflow'),
        ('mobile-email', 'screenshots/mobile/email__375x812__dark.png', 'E-Mail · Mobile'),
    ],
    'pages': [
        ('pages-overview', 'screenshots/pages/pages-overview__1440x1000__dark.png', 'Pages · Übersicht'),
        ('pages-editor', 'screenshots/pages/page-test__1440x1000__dark.png', 'Pages · Editor'),
        ('pages-block-menu', 'screenshots/pages/page-qa-block-menu__1440x1000__dark.png', 'Pages · verstecktes Blockmenü'),
    ],
    'settings-errors': [
        ('settings-desktop', 'screenshots/desktop-dark/settings__1440x1000__dark__default.png', 'System-Einstellungen'),
        ('finance-empty', 'screenshots/desktop-dark/finance__1440x1000__dark__default.png', 'Finance · 500 als Empty State'),
        ('shopping-empty', 'screenshots/desktop-dark/shopping__1440x1000__dark__default.png', 'Shopping · 500 als Empty State'),
        ('email-empty', 'screenshots/desktop-dark/email__1440x1000__dark__default.png', 'E-Mail · 500 als Empty State'),
    ],
    'media': [
        ('recipes-grid', 'screenshots/desktop-dark/recipes__1440x1000__dark__default.png', 'Rezepte · fehlende Bild-Fallbacks'),
        ('media-grid', 'screenshots/desktop-dark/media__1440x1000__dark__default.png', 'Medien · Galerie'),
    ],
    'accessibility': [
        ('a11y-dashboard', 'screenshots/mobile/dashboard__375x812__dark.png', 'Mobile Touch-/Kontrastprüfung'),
        ('a11y-pages', 'screenshots/pages/pages-overview__1440x1000__dark.png', 'Pages · semantische Klickziele'),
    ],
    'theming': [
        ('theme-directions', 'screenshots/concepts/theme-directions__1440x1000.png', 'Vier Design-/Theme-Richtungen'),
        ('dashboard-light', 'screenshots/desktop-light/dashboard__1440x1000__light__default.png', 'Dashboard · Light Mode'),
    ],
    'routing': [
        ('route-travel', 'screenshots/desktop-dark/travel__1440x1000__dark__default.png', 'Travel-Deep-Link landet im Dashboard'),
        ('route-search', 'screenshots/desktop-dark/search__1440x1000__dark__default.png', 'Search-Deep-Link landet im Dashboard'),
    ],
    'domains': [
        ('domain-finance', 'screenshots/desktop-dark/finance__1440x1000__dark__default.png', 'Finance · Silent Failure'),
        ('domain-shopping', 'screenshots/desktop-dark/shopping__1440x1000__dark__default.png', 'Shopping · Silent Failure'),
        ('domain-email', 'screenshots/desktop-dark/email__1440x1000__dark__default.png', 'E-Mail · Silent Failure'),
        ('domain-recipes', 'screenshots/desktop-dark/recipes__1440x1000__dark__default.png', 'Recipes · Bildzustände'),
    ],
    'pages-notion': [
        ('code-pages-editor', 'screenshots/pages/page-test__1440x1000__dark.png', 'Pages/Notion · Editor'),
        ('code-pages-menu', 'screenshots/pages/page-qa-block-menu__1440x1000__dark.png', 'Pages · Blockaktionen'),
    ],
    'browser': [
        ('browser-start', 'screenshots/browser/browser-active__1440x1000__dark.png', 'Browser · Cold Start'),
        ('browser-black', 'screenshots/browser/browser-after-remount__1440x1000__dark.png', 'Browser · schwarzer Reconnect-Viewport'),
        ('browser-before', 'screenshots/browser/browser-before__1440x1000__dark.png', 'Browser · Research-Workspace davor'),
    ],
    'security': [
        ('security-browser', 'screenshots/browser/browser-after-remount__1440x1000__dark.png', 'Browser-Security-Kontext'),
        ('security-settings', 'screenshots/desktop-dark/settings__1440x1000__dark__default.png', 'System-/Account-Kontext'),
    ],
    'performance': [
        ('perf-music', 'screenshots/desktop-dark/jellyfin__music__1440x1000__dark__default.png', 'Jellyfin Music · DOM/Bundle'),
        ('perf-recipes', 'screenshots/desktop-dark/recipes__1440x1000__dark__default.png', 'Recipes · Bild-/Payload-Kosten'),
    ],
    'tests': [
        ('tests-report', 'code-report-render.png', 'Gerenderter Auditbericht'),
    ],
    'docker': [
        ('docker-target', 'screenshots/concepts/theme-directions__1440x1000.png', 'Review-Kontext · Zielarchitektur im Bericht'),
    ],
}


FINDING_IMAGE_MAP = {
    'UI-001': ['theme-directions'], 'UI-004': ['dashboard-light'], 'UI-005': ['theme-directions'], 'UI-006': ['theme-directions'],
    'UI-008': ['dashboard-desktop'], 'UI-009': ['dashboard-mobile'], 'UI-010': ['mobile-pages', 'mobile-settings', 'mobile-email'],
    'UI-011': ['pages-editor'], 'UI-012': ['a11y-dashboard'], 'UI-013': ['a11y-pages'], 'UI-014': ['finance-empty', 'shopping-empty', 'email-empty'],
    'UI-015': ['recipes-grid'], 'UI-016': ['pages-overview'], 'UI-017': ['mobile-settings'],
    'FUNC-001': ['route-travel', 'route-search'], 'FUNC-003': ['domain-finance'], 'FUNC-004': ['domain-shopping'], 'FUNC-005': ['domain-email'],
    'PAGE-001': ['code-pages-menu'], 'PAGE-002': ['code-pages-menu'], 'PAGE-004': ['code-pages-editor'], 'PAGE-005': ['code-pages-editor'],
    'BROW-001': ['browser-start'], 'BROW-002': ['browser-black'], 'BROW-004': ['browser-black'], 'BROW-005': ['browser-black'],
    'PERF-002': ['perf-recipes'], 'PERF-004': ['perf-music'],
    'JELM-001': ['jellyfin-music-mobile-music-home', 'jellyfin-music-mobile-music-library'],
    'JELM-002': ['jellyfin-music-music-library-genres', 'jellyfin-music-music-artist-detail'],
    'JELM-003': ['jellyfin-music-music-nowplaying-now-playing'],
    'JELM-004': ['jellyfin-music-music-artist-detail'],
    'JELM-005': ['jellyfin-music-music-home'],
    'JELM-006': ['jellyfin-music-music-nowplaying-queue'],
    'JELM-007': ['jellyfin-music-music-tracks', 'jellyfin-music-music-nowplaying-queue'],
    'JELV-001': ['jellyfin-video-video-player', 'jellyfin-video-mobile-player'],
    'JELV-002': ['jellyfin-video-video-home'],
    'JELV-003': ['jellyfin-video-video-series', 'jellyfin-video-video-home'],
    'JELV-004': ['jellyfin-video-video-player'],
}


def deep_images(area_id: str) -> list[tuple[str, str, str]]:
    deep_dir = EVIDENCE / 'screenshots' / 'jellyfin-deep'
    if not deep_dir.exists():
        return []
    if area_id == 'jellyfin-music':
        files = sorted(p for p in deep_dir.glob('*.png') if p.name.startswith('music-') or p.name.startswith('mobile-music') or p.name.startswith('mobile-album') or p.name.startswith('mobile-nowplaying'))
    elif area_id == 'jellyfin-video':
        files = sorted(p for p in deep_dir.glob('*.png') if p.name.startswith('video-') or p.name.startswith('mobile-video') or p.name.startswith('mobile-movie') or p.name.startswith('mobile-series') or p.name.startswith('mobile-player'))
    else:
        return []
    result = []
    for screenshot in files:
        state_slug = screenshot.stem.split('__', 1)[0].replace('_', '-').lower()
        result.append((
            f'{area_id}-{state_slug}',
            screenshot.relative_to(EVIDENCE).as_posix(),
            state_slug.replace('-', ' · '),
        ))
    return result


def mime_for(path: Path) -> str:
    return mimetypes.guess_type(path.name)[0] or 'application/octet-stream'


def data_url(path: Path) -> str:
    return f'data:{mime_for(path)};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def thumbnail_data_url(path: Path, max_size: tuple[int, int] = (480, 280)) -> str:
    with Image.open(path) as image:
        converted = image.convert('RGB')
        converted.thumbnail(max_size, Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        converted.save(buffer, format='JPEG', quality=76, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buffer.getvalue()).decode('ascii')


def build_images(area_id: str, embed_images: bool) -> list[dict]:
    specs = list(IMAGE_CONFIG.get(area_id, [])) + deep_images(area_id)
    result = []
    for image_id, relative, caption in specs:
        path = EVIDENCE / relative
        if not path.exists():
            continue
        if embed_images:
            src = data_url(path)
            thumb = thumbnail_data_url(path)
        else:
            src = str(path.relative_to(REVIEWS)).replace('\\', '/')
            thumb = src
        result.append(dict(id=image_id, src=src, thumb=thumb, cap=caption, sourcePath=str(path.relative_to(ROOT)).replace('\\', '/')))
    return result


def area_config(report: str) -> list[dict]:
    return [dict(item) for item in (UI_AREAS if report == 'UI' else CODE_AREAS)]


def finding_to_data(row: dict[str, str], known_image_ids: set[str]) -> dict:
    image_ids = [image_id for image_id in FINDING_IMAGE_MAP.get(row['ID'], []) if image_id in known_image_ids]
    return {
        'id': row['ID'],
        'severity': row['Severity'],
        'category': row['Category'],
        'title': row['Title'],
        'detail': f"Auswirkung: {row['Impact']}\n\nUrsache: {row['RootCause']}",
        'impact': row['Impact'],
        'rootCause': row['RootCause'],
        'ref': row['Evidence'],
        'status': row['BacklogStatus'].lower() if row.get('BacklogStatus') else 'open',
        'changedIn': None,
        'imageIds': image_ids,
        'effort': row['Effort'],
        'dependencies': [part.strip() for part in row['Dependencies'].split(',') if part.strip()],
        'owner': row['SuggestedOwner'],
        'suggestions': [{
            'id': f"{row['ID']}-F1",
            'title': 'Empfohlener Fix',
            'note': row['Recommendation'],
            'acceptanceCriteria': row['AcceptanceCriteria'],
            'effort': row['Effort'],
            'dependencies': row['Dependencies'],
        }],
    }


def build_review_data(report: str, embed_images: bool = True) -> dict:
    if report not in {'UI', 'Code'}:
        raise ValueError(report)
    rows = [row for row in read_backlog() if row['Report'] == report]
    areas = area_config(report)
    mapper: Callable[[dict[str, str]], str] = ui_area_for if report == 'UI' else code_area_for
    by_area = {area['id']: [] for area in areas}
    for row in rows:
        area_id = mapper(row)
        if area_id not in by_area:
            raise KeyError(f'Kein Bereich für {row["ID"]}: {area_id}')
        by_area[area_id].append(row)

    for area in areas:
        area['images'] = build_images(area['id'], embed_images)
        known_images = {image['id'] for image in area['images']}
        area['suggestions'] = [{
            'id': f"AREA-{area['id'].upper()}-F1",
            'title': 'Bereich als gemeinsames Fixpaket behandeln',
            'note': area.pop('suggestion'),
            'acceptanceCriteria': f"Alle akzeptierten Findings im Bereich {area['tab']} sind umgesetzt und mit den jeweiligen Einzelkriterien verifiziert.",
        }]
        area['findings'] = [finding_to_data(row, known_images) for row in by_area[area['id']]]

    if report == 'UI':
        report_id = 'lifehub-ui-review-2026-08-22'
        title = 'LifeHub UI-/UX-/Design-Review · Interaktiv'
        subtitle = 'Designsystem · Responsive · Accessibility · Pages · kommentierbar und versioniert'
        intro = 'Visuell besitzt LifeHub eine erkennbare Dark-Mode-Basis. Dieser interaktive Bericht ermöglicht Entscheidungen, Kommentare und präzise Bildmarkierungen zu jedem Befund.'
    else:
        report_id = 'lifehub-code-review-2026-08-22'
        title = 'LifeHub Code-/Funktionsreview · Interaktiv'
        subtitle = 'Live · Pages/Notion · Browser · Jellyfin · Security · Performance · Docker'
        intro = 'Der Bericht verbindet Live-Evidenz und Quellcode. Jeder Fix kann übernommen, abgelehnt oder kommentiert werden; abgeschlossene Änderungsanforderungen werden als v1/v2 mit Delta exportiert.'

    return {
        'schemaVersion': 2,
        'reportId': report_id,
        'storageKey': f'lifehub-interactive-review:{report_id}',
        'version': 1,
        'date': '2026-08-22',
        'title': title,
        'subtitle': subtitle,
        'intro': intro,
        'sourceCommit': '0fb76aa',
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'areas': areas,
    }


def render_standalone_html(data: dict) -> str:
    css = (TOOL_DIR / 'interactive-review.css').read_text(encoding='utf-8')
    core = (TOOL_DIR / 'review-state-core.js').read_text(encoding='utf-8')
    app = (TOOL_DIR / 'interactive-review-app.js').read_text(encoding='utf-8')
    payload = json.dumps([data], ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    return f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{data['title']}</title><style>{css}</style></head><body>
<div id="app" class="review-shell"><aside id="timeline" class="timeline" aria-label="Review-Timeline"></aside><div class="content"><div class="wrap">
<header class="review-header"><h1 id="reportTitle"></h1><div id="reportSubtitle" class="meta"></div><div id="metaLine" class="meta"></div>
<div class="toolbar"><label for="reviewVersionSelect">Review:</label><select id="reviewVersionSelect" class="select"></select><button id="diffToggle" class="btn">🔀 Review-Diff</button><span class="spacer"></span><button id="importBtn" class="btn">⬆ Feedback importieren</button><input id="importFile" class="hidden" type="file" accept="application/json,.json"><button id="draftExportBtn" class="btn">⬇ Entwurf exportieren</button><button id="finishBtn" class="btn primary">✅ Änderungsanforderung abschließen</button><span id="savedBadge" class="saved">Gespeichert ✓</span></div><div id="stats" class="stats"></div></header>
<nav id="tabs" class="tabs" role="tablist" aria-label="Review-Bereiche"></nav><div class="filters"><select id="decisionFilter" class="select"><option value="">Alle Entscheidungen</option><option value="accepted">Übernommen</option><option value="rejected">Abgelehnt</option><option value="commented">Kommentiert</option><option value="undecided">Offen</option></select><input id="searchFilter" class="filter-input" placeholder="Finding, Bereich oder Fix durchsuchen …"><button id="diffOnlyButton" class="btn"><span id="diffOnlyLabel">Nur Änderungen</span></button></div>
<div id="snapshotBanner" class="snapshot-banner"></div><main id="main"></main><footer class="footer"><div id="footerProgressText"></div><div class="progress-line"><i id="footerProgress"></i></div><p>Kommentare, Entscheidungen, Versionen und Marker werden lokal gespeichert. Abschluss erzeugt eine agentenlesbare JSON-Datei mit Vollzustand und Delta.</p></footer>
</div></div></div>
<div id="lightbox" aria-hidden="true"><div class="lightbox-toolbar"><strong id="lightboxTitle"></strong><button class="annotation-tool" data-annotation-tool="rect">▭ Rechteck</button><button class="annotation-tool" data-annotation-tool="ellipse">◯ Kreis</button><span>Farbe:</span><button class="swatch on" data-marker-color="#ff4d6d" style="background:#ff4d6d" aria-label="Rot"></button><button class="swatch" data-marker-color="#e8912d" style="background:#e8912d" aria-label="Orange"></button><button class="swatch" data-marker-color="#49bd75" style="background:#49bd75" aria-label="Grün"></button><button class="annotation-tool" data-undo-marker>↺ Undo</button><span class="spacer"></span><button class="annotation-tool" data-close-lightbox>✕ Schließen</button></div><div class="lightbox-stage"><div class="image-stage"><img id="lightboxImage" alt=""><svg id="annotationOverlay" class="annotation-overlay" xmlns="http://www.w3.org/2000/svg"></svg></div></div><div id="markerPanel" class="marker-panel"></div></div>
<div id="finalizeModal" class="modal"><div class="modal-card"><h2 id="finalizeTitle"></h2><div id="finalizeSummary"></div><div class="modal-actions"><button id="savePickerBtn" class="btn primary">💾 Datei speichern …</button><button id="downloadBtn" class="btn">⬇ In Downloads</button><button id="closeFinalizeBtn" class="btn">Schließen</button></div></div></div>
<script>window.REVIEW_VERSIONS={payload};</script><script>{core}</script><script>{app}</script><script>InteractiveReviewApp.boot();</script></body></html>'''


def write_data(data: dict, name: str) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    lightweight = json.loads(json.dumps(data))
    for area in lightweight['areas']:
        for image in area.get('images', []):
            image['src'] = image.get('sourcePath', '')
            image['thumb'] = image.get('sourcePath', '')
    (DATA_DIR / f'{name}-r1.json').write_text(json.dumps(lightweight, ensure_ascii=False, indent=2), encoding='utf-8')


def _coverage_domain(filename: str) -> str | None:
    if filename.startswith('music-') or filename.startswith(('mobile-music', 'mobile-album', 'mobile-nowplaying')):
        return 'music'
    if filename.startswith('video-') or filename.startswith(('mobile-video', 'mobile-movie', 'mobile-series', 'mobile-player')):
        return 'video'
    return None


def _inferred_route(state: str, domain: str) -> str:
    if domain == 'music':
        mapping = {
            'music-home': '/jellyfin/music',
            'mobile-music-home': '/jellyfin/music',
            'music-library': '/jellyfin/music/library',
            'mobile-music-library': '/jellyfin/music/library',
            'music-favorites': '/jellyfin/music/favorites',
            'music-search': '/jellyfin/music/search',
            'music-nowplaying': '/jellyfin/music/tracks',
            'music-after': '/jellyfin/music/tracks',
            'mobile-nowplaying': '/jellyfin/music/tracks',
            'mobile-album-detail': '/jellyfin/music/album/[real-id]',
        }
    else:
        mapping = {
            'video-grid': '/jellyfin/browse',
            'video-watchlist': '/jellyfin/watchlist',
            'video-search': '/jellyfin/search',
            'video-player': '/jellyfin/watch/[real-id]',
            'mobile-player': '/jellyfin/watch/[real-id]',
            'mobile-video-home': '/jellyfin',
            'mobile-movie-detail': '/jellyfin/movies/[real-id]',
            'mobile-series-detail': '/jellyfin/series/[real-id]',
        }
    for prefix, route in mapping.items():
        if state.startswith(prefix):
            return route
    return '/jellyfin/music' if domain == 'music' else '/jellyfin'


def build_jellyfin_coverage() -> dict[str, list[dict[str, str | int]]]:
    deep_dir = EVIDENCE / 'screenshots' / 'jellyfin-deep'
    atlas_path = EVIDENCE / 'jellyfin-deep-atlas.json'
    atlas_by_file: dict[str, dict] = {}
    if atlas_path.exists():
        atlas = json.loads(atlas_path.read_text(encoding='utf-8'))
        for entry in atlas.get('entries', []):
            atlas_by_file[Path(entry.get('screenshot', '')).name] = entry

    coverage: dict[str, list[dict[str, str | int]]] = {'music': [], 'video': []}
    for screenshot in sorted(deep_dir.glob('*.png')):
        domain = _coverage_domain(screenshot.name)
        if not domain:
            continue
        state = screenshot.stem.split('__', 1)[0]
        viewport = screenshot.stem.split('__', 1)[1] if '__' in screenshot.stem else 'unknown'
        atlas_entry = atlas_by_file.get(screenshot.name, {})
        network_404s = sum(1 for failure in atlas_entry.get('networkFailures', []) if int(failure.get('status') or 0) == 404)
        route = atlas_entry.get('route') or _inferred_route(state, domain)

        if state in {'video-player', 'mobile-player'}:
            functional_status = 'FAIL_PLAYBACK'
            notes = 'Realer Stream endet mit Wiedergabefehler / ERR_BLOCKED_BY_ORB.'
        elif state in {'mobile-music-home', 'mobile-music-library', 'mobile-nowplaying'}:
            functional_status = 'FAIL_RESPONSIVE'
            notes = 'Permanente Musik-Sidebar und Player komprimieren/überlagern den Inhalt.'
        elif state == 'music-after-trusted-play':
            functional_status = 'PASS_INTERACTION'
            notes = 'Echter CDP-Klick: Pause-Status und fortschreitende Zeit verifiziert.'
        elif state.startswith('music-nowplaying-'):
            functional_status = 'PASS_TAB_CAPTURED'
            notes = 'Tab während realer Wiedergabe erfasst; visuelle Findings separat bewertet.'
        elif network_404s:
            functional_status = 'PARTIAL_IMAGE_404'
            notes = f'{network_404s} Bild-404s während dieser Route erfasst.'
        else:
            functional_status = 'CAPTURED'
            notes = 'Route/Zustand visuell erfasst; kein vollständiger Mutationstest behauptet.'

        coverage[domain].append({
            'Area': 'Jellyfin Musik' if domain == 'music' else 'Jellyfin Filme & Serien',
            'State': state,
            'Route': route,
            'Viewport': viewport,
            'Coverage': 'REAL_ID' if '[real-id]' in route or any(part in route for part in ('/album/', '/artist/', '/playlist/', '/movies/', '/series/', '/watch/')) else 'STATIC_OR_TAB',
            'FunctionalStatus': functional_status,
            'Network404s': network_404s,
            'ScreenshotFile': screenshot.name,
            'EvidencePath': screenshot.relative_to(ROOT).as_posix(),
            'Notes': notes,
        })
    return coverage


def write_jellyfin_coverage(coverage: dict[str, list[dict[str, str | int]]]) -> None:
    fields = ['Area', 'State', 'Route', 'Viewport', 'Coverage', 'FunctionalStatus', 'Network404s', 'ScreenshotFile', 'EvidencePath', 'Notes']
    for domain, rows in coverage.items():
        output = EVIDENCE / f'jellyfin-{domain}-coverage.csv'
        with output.open('w', encoding='utf-8-sig', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)


def build_all() -> dict:
    ui = build_review_data('UI', embed_images=True)
    code = build_review_data('Code', embed_images=True)
    UI_OUTPUT.write_text(render_standalone_html(ui), encoding='utf-8')
    CODE_OUTPUT.write_text(render_standalone_html(code), encoding='utf-8')
    write_data(ui, 'lifehub-ui')
    write_data(code, 'lifehub-code')
    coverage = build_jellyfin_coverage()
    write_jellyfin_coverage(coverage)
    return {
        'uiFindings': sum(len(area['findings']) for area in ui['areas']),
        'codeFindings': sum(len(area['findings']) for area in code['areas']),
        'uiImages': sum(len(area['images']) for area in ui['areas']),
        'codeImages': sum(len(area['images']) for area in code['areas']),
        'jellyfinMusicStates': len(coverage['music']),
        'jellyfinVideoStates': len(coverage['video']),
        'uiBytes': UI_OUTPUT.stat().st_size,
        'codeBytes': CODE_OUTPUT.stat().st_size,
    }


if __name__ == '__main__':
    print(json.dumps(build_all(), ensure_ascii=False, indent=2))
