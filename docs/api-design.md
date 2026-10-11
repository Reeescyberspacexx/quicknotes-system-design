# QuickNotes API Design

This is the API the backend team should build for QuickNotes. It follows REST: resources are plural nouns, the HTTP method is the action, and every request to a protected endpoint carries a token in the `Authorization: Bearer <token>` header. All data is JSON and all traffic uses HTTPS.

## Endpoints

| Method | Path               | Description                                                            | Success status |
| ------ | ------------------ | ---------------------------------------------------------------------- | -------------- |
| POST   | `/auth/login`      | Log in with email and password and receive a token                     | 200 OK         |
| GET    | `/notes`           | List the logged-in user's notes (supports `?category=` and `?search=`) | 200 OK         |
| GET    | `/notes/{id}`      | Get one note                                                           | 200 OK         |
| POST   | `/notes`           | Create a note                                                          | 201 Created    |
| PATCH  | `/notes/{id}`      | Update some fields of a note                                           | 200 OK         |
| DELETE | `/notes/{id}`      | Delete a note                                                          | 204 No Content |
| GET    | `/tags`            | List all tags                                                          | 200 OK         |
| POST   | `/notes/{id}/tags` | Attach a tag to a note                                                 | 201 Created    |

## Example: create a note

`POST /notes`

Request body:

```json
{
  "text": "Revise HTTP methods",
  "category": "study",
  "tags": ["exams", "urgent"]
}
```

Response (`201 Created`):

```json
{
  "id": 42,
  "text": "Revise HTTP methods",
  "category": "study",
  "tags": ["exams", "urgent"],
  "createdAt": "2026-10-12T09:15:00Z"
}
```

## Example: list notes

`GET /notes?category=study`

Response (`200 OK`):

```json
[
  {
    "id": 42,
    "text": "Revise HTTP methods",
    "category": "study",
    "tags": ["exams", "urgent"],
    "createdAt": "2026-10-12T09:15:00Z"
  },
  {
    "id": 43,
    "text": "Practise SQL joins",
    "category": "study",
    "tags": [],
    "createdAt": "2026-10-12T10:02:00Z"
  }
]
```

## Error codes

| Status                    | Meaning                       | Example                                                              |
| ------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| 400 Bad Request           | The request is invalid        | `POST /notes` with an empty `text`, or with more than 200 characters |
| 401 Unauthorized          | Missing or invalid token      | `GET /notes` with no `Authorization` header                          |
| 403 Forbidden             | Logged in, but not allowed    | `DELETE /notes/7` where note 7 belongs to another user               |
| 404 Not Found             | The item does not exist       | `GET /notes/9999` when no note has that id                           |
| 500 Internal Server Error | Something broke on the server | The database is unreachable while listing notes                      |

Example error body (for a 400):

```json
{
  "error": {
    "status": 400,
    "message": "Note text must be between 1 and 200 characters."
  }
}
```
