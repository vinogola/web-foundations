const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const USERS_URL = "https://jsonplaceholder.typicode.com/users";

// Filtering reads from this array, so typing never triggers a new request.
let users = [];

const renderUsers = (list) => {
  usersList.replaceChildren();

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No users match your filter.";
    usersList.appendChild(empty);
    return;
  }

  list.forEach((user) => {
    const item = document.createElement("li");

    const name = document.createElement("h3");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    item.append(name, email, city, company);
    usersList.appendChild(item);
  });
};

const getVisibleUsers = () => {
  const term = filterInput.value.trim().toLowerCase();
  return users.filter((user) => user.name.toLowerCase().includes(term));
};

const loadUsers = async () => {
  loadButton.disabled = true;
  statusMessage.textContent = "Loading users...";

  try {
    const response = await fetch(USERS_URL);

    // fetch doesn't throw on 404 or 500, so check response.ok.
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    users = await response.json();
    renderUsers(getVisibleUsers());
    statusMessage.textContent = `Loaded ${users.length} users.`;
  } catch (error) {
    statusMessage.textContent = `Could not load users: ${error.message}`;
  } finally {
    // Re-enable the button whether the request worked or not.
    loadButton.disabled = false;
  }
};

loadButton.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
  if (users.length === 0) return;
  renderUsers(getVisibleUsers());
});
