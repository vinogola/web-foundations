# School Database Design

A small database for a school that tracks students, the courses they take, and the grade each student gets on each course. The SQL is in `school.sql`.

## Tables

- **students**: one row per student. It holds an `id` (primary key), the student's `name` and a unique `email`. The email is unique so two students can't share an address, and it's a safe way to find one specific student.
- **courses**: one row per course. It holds an `id` (primary key), the course `title` and its `credits`.
- **enrolments**: one row each time a student takes a course. It holds its own `id`, a `student_id` and a `course_id` (both foreign keys), and the `grade`. The grade is empty (`NULL`) until the course is marked, and it must be between 0 and 100.

## Relationships

- One student has many enrolments, and each enrolment belongs to one student. That's **one-to-many**.
- One course has many enrolments, and each enrolment belongs to one course. That's also **one-to-many**.
- Together, those two give a **many-to-many** relationship between students and courses: a student takes several courses, and a course has several students.

A join table (`enrolments`) is needed because a relational table can't store a list in one column. Putting a list of course ids in `students`, or a list of student ids in `courses`, would break the one-value-per-cell rule and make queries like "who is on this course?" awkward. The join table keeps one row per pair instead. It also gives the grade a home: the grade belongs to the pair (this student on this course), not to the student or the course alone.

Two rules protect the data. `UNIQUE (student_id, course_id)` stops the same student enrolling on the same course twice, and the foreign keys stop an enrolment from pointing at a student or course that doesn't exist.

## Index I would add

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments (course_id);
```

The queries "students on one course" and "students per course" both look up enrolments by `course_id`. The `UNIQUE (student_id, course_id)` rule already creates an index, but it starts with `student_id`, so it only helps lookups by student. Without a separate index on `course_id`, SQLite scans the whole enrolments table every time (I checked with `EXPLAIN QUERY PLAN`: it reports a scan before the index and a search using it after). That doesn't matter with six rows, but a school with thousands of enrolments would feel it. The cost is small: writes get slightly slower and the index takes some extra storage.

## SQL or NoSQL

I'd choose SQL. The data is structured and connected: students, courses and enrolments always have the same fields, and the whole point of the system is the relationships between them. I want the database itself to enforce the rules (unique emails, no duplicate enrolments, no enrolment for a student who doesn't exist), and I want joins and counts, such as the number of students per course, without writing extra code. A document database could store each course with its students nested inside, but then a student's name and email would be copied into every course they take, and changing one email would mean updating it in many places. NoSQL fits better when records vary a lot in shape or when the scale is huge and the lookups are simple. A school's enrolment records are neither.
