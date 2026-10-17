# Reflection

The hardest idea for me was keeping the screen in step with the data behind it. In QuickNotes the bugs kept coming from that gap: a restored draft overwrote what I typed, and the note count stayed blank until the first click. A CSS class got added and never removed, too, so the counter stayed red after I'd deleted the text. I got past it by changing how I worked. I wrote the plan in plain English before any code. I traced each bug line by line before touching it, and I listed the edge cases first (180 and 200 characters, pasting 250, emptying the box) and tested every one. Once I saw that each update should rebuild the page from the data, the bugs got easier to find.

Feedback gave me two things to fix. On Project 1, the grader said the note count should follow the search, and I got that wrong. I'd now show the number of matching results. On Project 2, the feedback said my architecture document was cut off before the trade-offs. The file on GitHub was complete, so the reader probably stopped partway. I shortened the document so the trade-offs come well before the end, and Day 7 went from 82 to 96. Next time I'll keep documents short and check how they end.

Next I want to learn backend development with Node.js and SQL. I designed an API and a database on paper for QuickNotes and TicketHub, and I want to build one that runs.
