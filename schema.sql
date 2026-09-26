```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    settings TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user
ON conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON sessions(user_id);

INSERT OR IGNORE INTO site_settings
(id, settings, updated_at)
VALUES (
    1,
    '{"status":"Available for opportunities","title":"Let'\''s build something great.","description":"Have an idea, project or opportunity? Send me a message and let'\''s turn it into something awesome.","email":"almiteextra2@gmail.com","contactText":"Contact Me","loginText":"Login","heroButton":"Contact Me","submitButton":"Send Message","navContact":"Contact","primary":"#7c3aed","secondary":"#06b6d4","background":"https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2200&q=85"}',
    strftime('%s','now') * 1000
);
```
