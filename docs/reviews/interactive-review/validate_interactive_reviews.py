from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REVIEWS = ROOT / 'docs' / 'reviews'
EVIDENCE = REVIEWS / 'evidence' / '2026-08-22-lifehub'
BACKLOG = REVIEWS / '2026-08-22_lifehub_prioritized_backlog.csv'
TARGETS = {
    'UI': {
        'html': REVIEWS / '2026-08-22_lifehub_ui_design_review.html',
        'md': REVIEWS / '2026-08-22_lifehub_ui_design_review.md',
        'count': 17,
        'images': 18,
    },
    'Code': {
        'html': REVIEWS / '2026-08-22_lifehub_code_functionality_review.html',
        'md': REVIEWS / '2026-08-22_lifehub_code_functionality_review.md',
        'count': 72,
        'images': 79,
    },
}


def embedded_versions(html: str) -> list[dict]:
    prefix = 'window.REVIEW_VERSIONS='
    start = html.index(prefix) + len(prefix)
    end = html.index(';</script><script>', start)
    return json.loads(html[start:end])


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    checks: list[str] = []
    rows = load_csv(BACKLOG)
    ids = [row['ID'] for row in rows]
    assert len(rows) == 89
    assert len(ids) == len(set(ids))
    assert Counter(row['Severity'] for row in rows) == {'P0': 17, 'P1': 54, 'P2': 18}
    checks.append('89 unique backlog findings and severity totals')

    all_text_for_secret_scan = []
    for report, target in TARGETS.items():
        html = target['html'].read_text(encoding='utf-8')
        markdown = target['md'].read_text(encoding='utf-8')
        versions = embedded_versions(html)
        assert len(versions) >= 1
        review = versions[-1]
        findings = [finding for area in review['areas'] for finding in area['findings']]
        images = [image for area in review['areas'] for image in area.get('images', [])]
        expected_ids = {row['ID'] for row in rows if row['Report'] == report}
        assert len(findings) == target['count']
        assert {finding['id'] for finding in findings} == expected_ids
        assert all(finding['id'] in markdown for finding in findings)
        assert all(finding['id'] in html for finding in findings)
        assert all(len(finding.get('suggestions', [])) == 1 for finding in findings)
        assert all(finding['suggestions'][0].get('note', '').strip() for finding in findings)
        assert all(finding['suggestions'][0].get('acceptanceCriteria', '').strip() for finding in findings)
        assert len(images) == target['images']
        assert len({image['id'] for image in images}) == len(images)
        assert all(image['src'].startswith('data:image/') for image in images)
        assert all(image['thumb'].startswith('data:image/') for image in images)
        assert '<script src=' not in html
        assert '<link rel="stylesheet"' not in html
        assert 'ReviewStateCore' in html and 'InteractiveReviewApp' in html
        checks.append(f'{report}: HTML/Markdown/CSV IDs, fixes, acceptance and embedded images')
        stripped = re.sub(r'data:image/[^;]+;base64,[A-Za-z0-9+/=]+', '[EMBEDDED_IMAGE]', html)
        all_text_for_secret_scan.extend([stripped, markdown])

    music = load_csv(EVIDENCE / 'jellyfin-music-coverage.csv')
    video = load_csv(EVIDENCE / 'jellyfin-video-coverage.csv')
    assert len(music) == 40 and len(video) == 22
    for row in music + video:
        evidence_path = ROOT / row['EvidencePath']
        assert evidence_path.is_file(), evidence_path
        assert row['FunctionalStatus'] in {
            'CAPTURED', 'PARTIAL_IMAGE_404', 'PASS_INTERACTION',
            'PASS_TAB_CAPTURED', 'FAIL_PLAYBACK', 'FAIL_RESPONSIVE',
        }
    assert sum(row['FunctionalStatus'] == 'FAIL_PLAYBACK' for row in video) == 2
    assert any(row['FunctionalStatus'] == 'PASS_INTERACTION' for row in music)
    checks.append('40 music + 22 video coverage rows and screenshot files')

    browser_result = json.loads((EVIDENCE / 'interactive-review-browser-test.json').read_text(encoding='utf-8'))
    assert browser_result['status'] == 'PASS'
    assert len(browser_result['checks']) == 9
    assert all(check['status'] == 'PASS' for check in browser_result['checks'])
    checks.append('9 browser interaction checks pass')

    evidence_files = [path for path in EVIDENCE.rglob('*') if path.is_file()]
    screenshots = [path for path in evidence_files if path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp'}]
    assert len(evidence_files) == 298
    assert len(screenshots) == 249
    checks.append('298 evidence files and 249 screenshots')

    combined = '\n'.join(all_text_for_secret_scan)
    assert not re.search(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}', combined)
    assert not re.search(r'Bearer\s+[A-Za-z0-9._-]{20,}', combined, re.I)
    assert not re.search(r'token=eyJ', combined, re.I)

    jellyfin_source = (ROOT / 'domains/jellyfin/src/services/jellyfin.service.ts').read_text(encoding='utf-8')
    source_key = re.search(r"defaultApiKey\s*=.*?\|\|\s*'([^']+)'", jellyfin_source)
    assert source_key and source_key.group(1) not in combined
    login_source = (ROOT / 'apps/frontend/src/app/login/page.tsx').read_text(encoding='utf-8')
    source_password = re.search(r"password:\s*'([^']+)'", login_source)
    if source_password:
        assert source_password.group(1) not in combined
    checks.append('JWT, bearer, query token, source Jellyfin key and default password redacted')

    result = {'status': 'PASS', 'checks': checks, 'findingCount': len(rows), 'screenshots': len(screenshots)}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
