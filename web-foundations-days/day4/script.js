const noteText = document.querySelector("#note-text");
const charCounter = document.querySelector("#char-count");
const wordCounter = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggleBtn = document.querySelector("#theme-toggle");
const body = document.body;

const savedNotes = localStorage.getItem("notes");

if (savedNotes !== null) noteText.value = savedNotes;

const updateCounts = () => {
  const value = noteText.value;
  const charCount = value.length;
  const trimmedValue = value.trim();
  const wordCount =
    trimmedValue.length === 0 ? 0 : trimmedValue.split(/\s+/).length;

  charCounter.classList.remove("warning", "over");

  if (charCount > 200) {
    charCounter.classList.add("over");
  } else if (charCount > 180) {
    charCounter.classList.add("warning");
  }

  charCounter.textContent = `${charCount} / 200 characters`;
  wordCounter.textContent = `${wordCount} words`;
};

const clearData = () => {
  noteText.value = "";
  localStorage.removeItem("notes");
  updateCounts();
};

noteText.addEventListener("input", updateCounts);
noteText.addEventListener("input", () => {
  localStorage.setItem("notes", noteText.value);
});

noteText.addEventListener("keydown", (e) => {
  if (e.key === "Escape") clearData();
});

clearBtn.addEventListener("click", clearData);

const applyTheme = (theme) => {
  if (theme === "dark") {
    body.classList.add("dark");
    themeToggleBtn.textContent = "Light mode";
  } else {
    body.classList.remove("dark");
    themeToggleBtn.textContent = "Dark mode";
  }
};

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  applyTheme(savedTheme);
}

themeToggleBtn.addEventListener("click", () => {
  const newTheme = body.classList.contains("dark") ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("theme", newTheme);
});

updateCounts();
