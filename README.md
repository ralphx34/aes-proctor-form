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
