CREATE TABLE IF NOT EXISTS results (
	id          TEXT    PRIMARY KEY,
	owner       TEXT    NOT NULL,
	meta        TEXT,
	site        TEXT    NOT NULL,
	result_url  TEXT,
	status      TEXT    NOT NULL,
	error       TEXT,
	completed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_results_owner ON results (owner, completed_at);
