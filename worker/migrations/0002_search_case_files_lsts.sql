CREATE TRIGGER IF NOT EXISTS trg_case_files_search
AFTER INSERT ON case_files
BEGIN
  INSERT INTO search_index (id, type, title, content)
  VALUES (new.id, 'case_file', COALESCE(new.title, 'Untitled Case'), COALESCE(new.content, '') || char(10) || COALESCE(new.html_content, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_case_files_search_update
AFTER UPDATE ON case_files
BEGIN
  DELETE FROM search_index WHERE id = old.id;
  INSERT INTO search_index (id, type, title, content)
  VALUES (new.id, 'case_file', COALESCE(new.title, 'Untitled Case'), COALESCE(new.content, '') || char(10) || COALESCE(new.html_content, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_case_files_search_delete
AFTER DELETE ON case_files
BEGIN
  DELETE FROM search_index WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_lsts_search
AFTER INSERT ON lsts
BEGIN
  INSERT INTO search_index (id, type, title, content)
  VALUES (
    new.id,
    'lst',
    new.title,
    COALESCE(new.description, '') || char(10) || COALESCE(new.recommendation, '') || char(10) || COALESCE(new.category, '') || char(10) || COALESCE(new.location, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_lsts_search_update
AFTER UPDATE ON lsts
BEGIN
  DELETE FROM search_index WHERE id = old.id;
  INSERT INTO search_index (id, type, title, content)
  VALUES (
    new.id,
    'lst',
    new.title,
    COALESCE(new.description, '') || char(10) || COALESCE(new.recommendation, '') || char(10) || COALESCE(new.category, '') || char(10) || COALESCE(new.location, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_lsts_search_delete
AFTER DELETE ON lsts
BEGIN
  DELETE FROM search_index WHERE id = old.id;
END;

DELETE FROM search_index WHERE type IN ('case_file', 'lst');

INSERT INTO search_index (id, type, title, content)
SELECT id, 'case_file', COALESCE(title, 'Untitled Case'), COALESCE(content, '') || char(10) || COALESCE(html_content, '')
FROM case_files;

INSERT INTO search_index (id, type, title, content)
SELECT
  id,
  'lst',
  title,
  COALESCE(description, '') || char(10) || COALESCE(recommendation, '') || char(10) || COALESCE(category, '') || char(10) || COALESCE(location, '')
FROM lsts;
