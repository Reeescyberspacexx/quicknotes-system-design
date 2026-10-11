# QuickNotes System Design

This project has two parts. The first is a small API client that loads, creates and deletes notes using the JSONPlaceholder practice API, with loading, success, error and empty states. The second is a set of design documents describing the real QuickNotes backend for 1 million users: its API, its database and its architecture.

## How to run the API client

1. Clone the repository: `git clone https://github.com/Reeescyberspacexx/quicknotes-system-design.git`
2. Open the folder in VS Code.
3. Install the Live Server extension if you do not have it.
4. Right-click `index.html` and choose "Open with Live Server".
5. Click "Load notes", create a note with the form, and delete notes with their Delete buttons.

JSONPlaceholder is a practice API and does not really save changes, so created notes always get id 101 and reappear or vanish when you reload.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- How to use `fetch` with `async` and `await`, `try`, `catch` and `finally`, and why `response.ok` must be checked.
- How to show loading, success, error and empty states, and disable buttons while a request runs.
- How to design a RESTful API with the right methods and status codes.
- How to model data with tables, keys and a join table, and why SQL suits QuickNotes.
- How caches, load balancers, replicas and queues work together to scale a system.
