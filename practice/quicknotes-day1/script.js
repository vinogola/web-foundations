// ---------- 1. Select the elements we need ----------
const form = document.querySelector("#note-form");
const input = document.querySelector("#note-input");
const list = document.querySelector("#notes-list");
const count = document.querySelector("#note-count");

const STORAGE_KEY = "quicknotes";

// ---------- 2. Load saved notes (or start empty) ----------
let notes = loadNotes();

function loadNotes() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ---------- 3. Draw the notes on the page ----------
function renderNotes() {
  list.innerHTML = "";

  notes.forEach((note) => {
    const li = document.createElement("li");
    li.classList.add("note");

    const text = document.createElement("span");
    text.textContent = note.text;

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.classList.add("delete-btn");
    del.addEventListener("click", () => deleteNote(note.id));

    list.appendChild(li);
    li.appendChild(text);
    li.appendChild(del);
  });

  count.textContent =
    notes.length === 1 ? "You have 1 note." : `You have ${notes.length} notes.`;
}

// ---------- 4. Add and delete ----------
function addNote(text) {
  notes.push({ id: Date.now(), text });
  saveNotes();
  renderNotes();
}

function deleteNote(id) {
  notes = notes.filter((note) => note.id !== id);
  saveNotes();
  renderNotes();
}

// ---------- 5. Listen for the form ----------
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (text) {
    addNote(text);
    input.value = "";
    input.focus();
  }
});

// ---------- 6. Draw once when the page first loads ----------
renderNotes();
