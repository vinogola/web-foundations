PRAGMA foreign_keys = ON;

-- Reset, so the script can be run more than once
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- Tables

CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL
);

-- Join table: one row per student on a course, plus that student's grade.
-- grade stays NULL until the course is marked.
CREATE TABLE enrolments (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade INTEGER CHECK (grade BETWEEN 0 AND 100),
  FOREIGN KEY (student_id) REFERENCES students (id),
  FOREIGN KEY (course_id) REFERENCES courses (id),
  UNIQUE (student_id, course_id)
);

-- Sample data

INSERT INTO students (name, email) VALUES
  ('Amina Otieno', 'amina@example.com'),
  ('Brian Kamau', 'brian@example.com'),
  ('Chebet Kiplagat', 'chebet@example.com'),
  ('David Mwangi', 'david@example.com');

INSERT INTO courses (title, credits) VALUES
  ('Web Foundations', 3),
  ('Databases', 4),
  ('Mathematics', 3);

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 88),
  (1, 2, 75),
  (2, 1, 64),
  (2, 3, NULL),
  (3, 2, 91),
  (3, 1, 79);

-- Queries

-- 1. All courses for one student, by name
SELECT c.title, e.grade
FROM students s
JOIN enrolments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id
WHERE s.name = 'Amina Otieno';

-- 2. All students on one course
SELECT s.name, s.email
FROM courses c
JOIN enrolments e ON e.course_id = c.id
JOIN students s ON s.id = e.student_id
WHERE c.title = 'Databases';

-- 3. Number of students per course (LEFT JOIN keeps courses with no students)
SELECT c.title, COUNT(e.id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON e.course_id = c.id
GROUP BY c.id, c.title;

-- 4. Students with no enrolments
SELECT s.name, s.email
FROM students s
LEFT JOIN enrolments e ON e.student_id = s.id
WHERE e.id IS NULL;

-- 5. Update one enrolment's grade: Brian's Mathematics result
UPDATE enrolments
SET grade = 72
WHERE student_id = (SELECT id FROM students WHERE email = 'brian@example.com')
  AND course_id = (SELECT id FROM courses WHERE title = 'Mathematics');

-- Check the update
SELECT s.name, c.title, e.grade
FROM enrolments e
JOIN students s ON s.id = e.student_id
JOIN courses c ON c.id = e.course_id
WHERE s.email = 'brian@example.com';
