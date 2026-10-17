# Library API Design

A REST API for a library's `books` resource. Every path starts with `/books`, and every request and response body is JSON.

A book looks like this:

```json
{
  "id": 1,
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958
}
```

## Endpoints

### 1. List all books

- **Method and path:** `GET /books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** `200 OK`

### 2. Get one book

- **Method and path:** `GET /books/{id}`
- **Description:** Returns the single book with the given id.
- **Request body:** none
- **Success status:** `200 OK`

### 3. Create a book

- **Method and path:** `POST /books`
- **Description:** Adds a new book. The server assigns the `id`.
- **Request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958
  }
  ```

- **Success status:** `201 Created`

### 4. Update a book

- **Method and path:** `PUT /books/{id}`
- **Description:** Replaces the book with the given id.
- **Request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1959
  }
  ```

- **Success status:** `200 OK`

### 5. Delete a book

- **Method and path:** `DELETE /books/{id}`
- **Description:** Removes the book with the given id.
- **Request body:** none
- **Success status:** `204 No Content`

### 6. List books by an author

- **Method and path:** `GET /books?author={name}`
- **Description:** Returns only the books written by the author in the query parameter, for example `GET /books?author=Chinua%20Achebe`.
- **Request body:** none
- **Success status:** `200 OK`

## Error codes

### 400 Bad Request

- **Meaning:** The request is malformed or the data is invalid.
- **Example:** `POST /books` with a body that has no `title`, or with `"year": "last year"` where a number is expected.
- **Example response body:**

  ```json
  { "error": "title is required" }
  ```

### 404 Not Found

- **Meaning:** The book being asked for does not exist.
- **Example:** `GET /books/9999` when no book has the id 9999. The same applies to `PUT` and `DELETE` on a missing id.
- **Example response body:**

  ```json
  { "error": "Book 9999 not found" }
  ```
