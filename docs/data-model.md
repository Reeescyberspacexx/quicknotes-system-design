# QuickNotes Data Model

QuickNotes needs four tables: `users`, `notes`, `tags` and a join table `note_tags`.

## Entities

### users

| Column        | Type    | Notes                               |
| ------------- | ------- | ----------------------------------- |
| id            | INTEGER | Primary key                         |
| name          | TEXT    | NOT NULL                            |
| email         | TEXT    | NOT NULL, UNIQUE                    |
| password_hash | TEXT    | NOT NULL (never the plain password) |
| created_at    | TEXT    | Defaults to the current time        |

### notes

| Column     | Type    | Notes                               |
| ---------- | ------- | ----------------------------------- |
| id         | INTEGER | Primary key                         |
| user_id    | INTEGER | Foreign key to `users.id`, NOT NULL |
| text       | TEXT    | NOT NULL, at most 200 characters    |
| category   | TEXT    | NOT NULL, defaults to `personal`    |
| created_at | TEXT    | Defaults to the current time        |

### tags

| Column | Type    | Notes            |
| ------ | ------- | ---------------- |
| id     | INTEGER | Primary key      |
| name   | TEXT    | NOT NULL, UNIQUE |

### note_tags

| Column  | Type    | Notes                     |
| ------- | ------- | ------------------------- |
| note_id | INTEGER | Foreign key to `notes.id` |
| tag_id  | INTEGER | Foreign key to `tags.id`  |

The primary key of `note_tags` is the pair `(note_id, tag_id)`.

## Relationships

- **One-to-many:** one user has many notes. Each note belongs to exactly one user, so `notes` holds a foreign key `user_id`.
- **Many-to-many:** a note can have many tags and a tag can be on many notes. A single column cannot hold several ids, so the join table `note_tags` stores one row per note-tag pair. Its composite primary key stops the same tag being attached to the same note twice.

## CREATE TABLE statements

```sql
CREATE TABLE users (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  text        TEXT NOT NULL CHECK (length(text) <= 200),
  category    TEXT NOT NULL DEFAULT 'personal',
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id  INTEGER NOT NULL,
  tag_id   INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

## Example queries

All notes for user 1, newest first (this is what `GET /notes` runs):

```sql
SELECT * FROM notes WHERE user_id = 1 ORDER BY created_at DESC;
```

All notes tagged "urgent", using two JOINs:

```sql
SELECT notes.text
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags ON tags.id = note_tags.tag_id
WHERE tags.name = 'urgent';
```

The number of notes each user has, including users with none:

```sql
SELECT users.name, COUNT(notes.id) AS note_count
FROM users
LEFT JOIN notes ON notes.user_id = users.id
GROUP BY users.id;
```

In the real server these use `?` placeholders for user values, never text glued into the SQL, to prevent SQL injection.

## Index

```sql
CREATE INDEX idx_notes_user_id ON notes(user_id);
```

Almost every request is "get this user's notes", which filters on `user_id`. Without an index the database scans every note of every user. With the index it jumps straight to that user's rows. The cost is slightly slower writes and a little extra storage, which suits a read-heavy app.

## SQL or NoSQL?

I choose **SQL**. QuickNotes data is clearly structured and has clear relationships: users own notes, and notes have tags. SQL handles these with foreign keys and JOINs, and the database itself enforces rules such as a unique email, the 200-character limit and "every note must belong to a real user". These rules keep the data correct even if the application code has a bug. A document database would suit very flexible data, but here it would mean duplicating tags or embedding notes inside users, which makes updates and consistency harder.
