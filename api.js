const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const list = document.querySelector("#notes-list");
const form = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");

let notes = [];

// One reusable function for every request: it calls fetch, checks
// response.ok and throws on HTTP errors, so every caller can use try/catch.
async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Server responded with status ${response.status}`);
  }
  const data = await response.json();
  return { data: data, status: response.status };
}

function setStatus(message, type) {
  statusText.textContent = message;
  statusText.className = `status-${type}`;
}

function render() {
  list.replaceChildren();

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.classList.add("empty");
    empty.textContent = "No notes to show. Load notes or create one.";
    list.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const li = document.createElement("li");
    li.classList.add("note");

    const title = document.createElement("h3");
    title.textContent = note.title;

    const body = document.createElement("p");
    body.textContent = note.body;

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.classList.add("delete-btn");
    del.addEventListener("click", () => deleteNote(note, del));

    li.append(title, body, del);
    list.appendChild(li);
  });
}

// GET: load 10 notes
async function loadNotes() {
  setStatus("Loading notes...", "loading");
  loadBtn.disabled = true;

  try {
    const { data } = await request(`${API_URL}?_limit=10`);
    notes = data;
    render();
    if (notes.length === 0) {
      setStatus("No notes found on the server.", "success");
    } else {
      setStatus(`Loaded ${notes.length} notes from the server.`, "success");
    }
  } catch (error) {
    setStatus("Could not load notes. Please try again.", "error");
    console.error(error);
  } finally {
    loadBtn.disabled = false;
  }
}

// POST: create a note
async function createNote(title, body) {
  setStatus("Creating note...", "loading");
  submitBtn.disabled = true;

  try {
    const { data, status } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, body: body, userId: 1 }),
    });
    notes.unshift(data); // newest note goes to the top
    render();
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
    form.reset();
  } catch (error) {
    setStatus("Could not create the note. Please try again.", "error");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
}

// DELETE: remove a note.
// JSONPlaceholder does not really save anything: every created note comes
// back with id 101, and a DELETE only pretends to succeed. So after the
// server confirms (response.ok), we remove that exact note object from our
// local array. We match by object, not by id, because several created notes
// share id 101. Reloading the notes brings back the server's original 10.
async function deleteNote(note, button) {
  setStatus("Deleting note...", "loading");
  button.disabled = true;

  try {
    const { status } = await request(`${API_URL}/${note.id}`, {
      method: "DELETE",
    });
    notes = notes.filter((item) => item !== note);
    render();
    setStatus(`Note ${note.id} deleted (status ${status}).`, "success");
  } catch (error) {
    setStatus("Could not delete the note. Please try again.", "error");
    console.error(error);
    button.disabled = false;
  }
}

loadBtn.addEventListener("click", loadNotes);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (title === "") {
    setStatus("A title is required.", "error");
    return;
  }
  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    return;
  }

  createNote(title, body);
});

render();