# AES Proctor Form — Midterm 1

Updated version: each testing cohort row is treated as one distinct proctor assignment.

## What changed

The form no longer aggregates by date.

If `cohort.csv` contains 18 rows, the form shows 18 response rows.

Every cohort row gets one response:

- Preferred
- Available
- Unavailable
- GA/TA for this class

The user must select exactly 3 `Preferred` cohort assignments.

## Sorting

Each visible cohort column has a sortable heading. Clicking a heading sorts the
cohorts in ascending order; clicking it again switches to descending order.
Dates and times sort chronologically, while text and room values use natural
alphabetical/numeric sorting.

Sorting only changes the displayed row order. Existing dropdown responses stay
with their original cohorts, and the submitted payload preserves the original
CSV cohort order.

## Displayed columns

The form displays every column in `cohort.csv` except columns explicitly listed as hidden in `script.js`.

By default, these are hidden:

- Room Size
- AES Students

`Room` is shown.

If the CSV later contains another administrative-only field, add that column name to `CONFIG.hiddenColumns` in `script.js`.

## Netlify deployment

1. Put the finalized Midterm 1 testing cohort file in the repository root as `cohort.csv`.
2. Push all files to GitHub.
3. Import the repository into Netlify as a static site.
4. Build command: blank.
5. Publish directory: `.`
6. Enable Netlify Forms / form detection if needed.
7. Redeploy.
8. Submit one test response and confirm it appears under form `aes-midterm-1`.

## Local testing

From the project directory:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

Local testing covers CSV loading, table generation, dropdowns, and validation.

The actual Netlify submission cannot be fully tested until the site is deployed on Netlify.


## Weekday display

Recognized date columns are displayed with a compact weekday prefix, for example:

- `T 9/29/2026`
- `W 9/30/2026`
- `Th 10/1/2026`

This is display-only. The underlying CSV value is preserved unchanged in the submitted payload.


## Final text changes

- The FCFS priority sentence is bolded for salience.
- The instructions now state that anyone genuinely unable to identify 3 preferred cohort assignments should contact the AES coordinator before submitting.

## Revising previously submitted preferences

The existing form now has an optional **Load previous submission (CSV)** field. The
AES coordinator should send a proctor **only their own single-row Netlify CSV
submission**, never the full Netlify export with other proctors' records. The
individual CSV must retain its column headers and the `preference_payload` JSON
field. No file is uploaded when it is selected; the browser reads it locally.

The form restores name, email and responses for uniquely matched cohort rows.
Matching uses Instructors, Course, Exam Date, Start, AES End and Room, but ignores
Room Size. Cohorts that have been added, removed, changed or cannot be matched
uniquely are not guessed: new/changed rows remain unselected and are highlighted.
The user reviews all responses and submits the updated form with exactly three
Preferred rows. Standard initial submissions work without any upload.

The optional `submission_type` field is `initial` for new submissions and
`revision` after a successful import. Netlify creates a separate submission for
each revision. **The uploaded file does not determine FCFS priority**: the AES
coordinator/matching process must retain the earliest valid original submission
timestamp from Netlify and use the most recent valid responses for matching.
This page does not enforce identity or deduplicate records server-side.

### Example: extract one individual record from the Netlify export

Open the full Netlify export in a spreadsheet, keep its header row and precisely
one data row corresponding to the proctor, then save as CSV with the
`preference_payload` column intact. If your spreadsheet application alters the
JSON quoting, the exported file may not import correctly. Do not put the full
Netlify export on the public website or send it to proctors.
