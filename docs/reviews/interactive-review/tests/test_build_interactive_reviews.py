import csv
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[4]
MODULE_PATH = ROOT / 'docs' / 'reviews' / 'interactive-review' / 'build_interactive_reviews.py'
spec = importlib.util.spec_from_file_location('interactive_builder', MODULE_PATH)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class InteractiveReviewBuilderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backlog = ROOT / 'docs' / 'reviews' / '2026-08-22_lifehub_prioritized_backlog.csv'
        with backlog.open(encoding='utf-8-sig', newline='') as handle:
            cls.rows = list(csv.DictReader(handle))

    def test_ui_mapping_preserves_every_ui_finding_once(self):
        data = builder.build_review_data('UI', embed_images=False)
        expected = {row['ID'] for row in self.rows if row['Report'] == 'UI'}
        actual = [finding['id'] for area in data['areas'] for finding in area['findings']]
        self.assertEqual(set(actual), expected)
        self.assertEqual(len(actual), len(set(actual)))

    def test_code_mapping_preserves_every_code_finding_once(self):
        data = builder.build_review_data('Code', embed_images=False)
        expected = {row['ID'] for row in self.rows if row['Report'] == 'Code'}
        actual = [finding['id'] for area in data['areas'] for finding in area['findings']]
        self.assertEqual(set(actual), expected)
        self.assertEqual(len(actual), len(set(actual)))

    def test_every_finding_has_direct_fix_and_acceptance_criteria(self):
        for report in ('UI', 'Code'):
            data = builder.build_review_data(report, embed_images=False)
            for area in data['areas']:
                for finding in area['findings']:
                    self.assertEqual(len(finding['suggestions']), 1, finding['id'])
                    suggestion = finding['suggestions'][0]
                    self.assertTrue(suggestion['note'].strip(), finding['id'])
                    self.assertTrue(suggestion['acceptanceCriteria'].strip(), finding['id'])

    def test_all_finding_image_ids_resolve(self):
        for report in ('UI', 'Code'):
            data = builder.build_review_data(report, embed_images=False)
            known = {image['id'] for area in data['areas'] for image in area.get('images', [])}
            for area in data['areas']:
                for finding in area['findings']:
                    self.assertTrue(set(finding.get('imageIds', [])).issubset(known), finding['id'])

    def test_standalone_html_embeds_scripts_styles_data_and_images(self):
        data = builder.build_review_data('UI', embed_images=True)
        html = builder.render_standalone_html(data)
        self.assertIn('window.REVIEW_VERSIONS', html)
        self.assertIn('ReviewStateCore', html)
        self.assertIn('InteractiveReviewApp', html)
        self.assertNotIn('<script src=', html)
        for area in data['areas']:
            for image in area.get('images', []):
                self.assertTrue(image['src'].startswith('data:image/'), image['id'])
                self.assertTrue(image['thumb'].startswith('data:image/'), image['id'])
                self.assertNotIn(f'src="{image["sourcePath"]}"', html)
        self.assertNotIn('href="interactive-review.css"', html)

    def test_deep_jellyfin_galleries_include_every_captured_state(self):
        data = builder.build_review_data('Code', embed_images=False)
        areas = {area['id']: area for area in data['areas']}
        self.assertGreaterEqual(len(areas['jellyfin-music']['images']), 40)
        self.assertGreaterEqual(len(areas['jellyfin-video']['images']), 22)

    def test_jellyfin_coverage_matrices_include_each_deep_screenshot_once(self):
        coverage = builder.build_jellyfin_coverage()
        deep = builder.EVIDENCE / 'screenshots' / 'jellyfin-deep'
        music_files = {path.name for path in deep.glob('*.png') if path.name.startswith('music-') or path.name.startswith('mobile-music') or path.name.startswith('mobile-album') or path.name.startswith('mobile-nowplaying')}
        video_files = {path.name for path in deep.glob('*.png') if path.name.startswith('video-') or path.name.startswith('mobile-video') or path.name.startswith('mobile-movie') or path.name.startswith('mobile-series') or path.name.startswith('mobile-player')}
        self.assertEqual({row['ScreenshotFile'] for row in coverage['music']}, music_files)
        self.assertEqual({row['ScreenshotFile'] for row in coverage['video']}, video_files)
        self.assertEqual(len(coverage['music']), len(music_files))
        self.assertEqual(len(coverage['video']), len(video_files))

    def test_report_id_and_storage_namespace_are_distinct(self):
        ui = builder.build_review_data('UI', embed_images=False)
        code = builder.build_review_data('Code', embed_images=False)
        self.assertNotEqual(ui['reportId'], code['reportId'])
        self.assertNotEqual(ui['storageKey'], code['storageKey'])


if __name__ == '__main__':
    unittest.main()
