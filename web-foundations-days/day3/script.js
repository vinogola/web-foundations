let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const searchNotes = (word) => {
  const filteredNotes = notes.filter((note) =>
    note.text.toLowerCase().includes(word.toLowerCase()),
  );
  return filteredNotes;
};

const longestNote = () => {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (let i = 1; i < notes.length; i++) {
    if (notes[i].text.length > longest.text.length) {
      longest = notes[i];
    }
  }

  return longest;
};

const countByCategory = () => {
  const categoryCount = {};

  for (const note of notes) {
    if (categoryCount[note.category]) {
      categoryCount[note.category]++;
    } else {
      categoryCount[note.category] = 1;
    }
  }

  return categoryCount;
};

const getSummary = () => {
  const categoryCount = countByCategory();
  const total = notes.length;
  const noteWord = total === 1 ? "note" : "notes";
  const categories = Object.entries(categoryCount)
    .map(([category, count]) => `${count} ${category}`)
    .join(", ");

  return `${total} ${noteWord}: ${categories}.`;
};

const isDuplicate = (text) => {
  const normalizedText = text.trim().toLowerCase();
  return notes.some(
    (note) => note.text.trim().toLowerCase() === normalizedText,
  );
};

const addNote = (text, category) => {
  if (typeof text !== "string" || text.length < 1 || text.length > 200) {
    console.log("Note text must be between 1 and 200 characters.");
    return false;
  }

  if (isDuplicate(text)) {
    console.log("A note with this text already exists.");
    return false;
  }

  if (!["personal", "work", "study"].includes(category)) {
    console.log("Category must be personal, work, or study.");
    return false;
  }

  notes.push({
    id: notes.length ? Math.max(...notes.map((note) => note.id)) + 1 : 1,
    text,
    category,
  });
  return true;
};

console.log(searchNotes("javascript")); // Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]
console.log(searchNotes("missing")); // Expected: []

console.log(longestNote()); // Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

console.log(countByCategory()); // Expected: { personal: 2, study: 2, work: 1 }
console.log(getSummary()); // Expected: "5 notes: 2 personal, 2 study, 1 work."

console.log(isDuplicate("  BUY MILK AND BREAD ")); // Expected: true
console.log(isDuplicate("A new note")); // Expected: false

console.log(addNote("Plan the weekend", "personal")); // Expected: true
console.log(addNote("", "personal")); // Expected: false (also logs the text validation message)

const savedNotes = notes;
notes = [];
console.log(longestNote()); // Expected: null
console.log(countByCategory()); // Expected: {}
console.log(getSummary()); // Expected: "0 notes: ."
notes = savedNotes;
