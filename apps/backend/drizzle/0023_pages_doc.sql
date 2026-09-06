-- Pages: BlockNote-Dokument-Modell (Notion-artiger Editor)
-- pages.content       = BlockNote-Doc (Array von Block-Objekten) als Inhaltsquelle
-- page_versions.doc   = Doc-Snapshot pro Version (NULL bei Legacy-Versionen)
-- Legacy page_blocks bleiben erhalten (browser_sessions hat FK darauf und die
-- Legacy-API bleibt nutzbar); Synthese Doc←Blöcke passiert beim ersten Lesen.

ALTER TABLE pages ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE page_versions ADD COLUMN IF NOT EXISTS doc JSONB;
