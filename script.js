const CONFIG = {
  examPeriod: "Midterm 1",
  cohortCsv: "cohort.csv",
  requiredPreferredCount: 3,

  // These columns are hidden from proctors.
  hiddenColumns: ["Room Size", "room size", "room_size", "AES Students", "aes students", "aes_students"]
};

const state = {
  cohorts: [],
  responseSelects: [],
  sort: {
    header: null,
    direction: "ascending"
  }
};

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
});

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const response = await fetch(CONFIG.cohortCsv, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load ${CONFIG.cohortCsv}.`);
    }

    const csvText = await response.text();
    const records = parseCsv(csvText);

    if (!records.length) {
      throw new Error("The cohort file contains no rows.");
    }

    state.cohorts = records;
    renderCohorts(records);

    document.getElementById("source-status").textContent =
      `${records.length} testing cohort${records.length === 1 ? "" : "s"} loaded.`;

    document.getElementById("availability-table-wrap").hidden = false;
  } catch (error) {
    showError(error.message);
    document.getElementById("source-status").textContent = "Testing cohorts could not be loaded.";
  }

  document.getElementById("proctor-form").addEventListener("submit", handleSubmit);
}

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase();
}


const DATE_HEADER_CANDIDATES = new Set([
  "date",
  "exam date",
  "testing date",
  "test date",
  "exam_date",
  "testing_date",
  "test_date"
]);

function isDateColumn(header) {
  return DATE_HEADER_CANDIDATES.has(normalizeHeader(header));
}

function formatDateWithWeekday(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;

  let date;

  // Handle common M/D/YYYY or MM/DD/YYYY values without timezone shifting.
  const mdY = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdY) {
    const [, month, day, year] = mdY;
    date = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    // Handle YYYY-MM-DD similarly.
    const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
      const [, year, month, day] = ymd;
      date = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      date = new Date(raw);
    }
  }

  if (Number.isNaN(date.valueOf())) return raw;

  const weekday = ["Su", "M", "T", "W", "Th", "F", "Sa"][date.getDay()];
  return `${weekday} ${raw}`;
}

function isHiddenColumn(header) {
  const hidden = new Set(CONFIG.hiddenColumns.map(normalizeHeader));
  return hidden.has(normalizeHeader(header));
}

function renderCohorts(records) {
  const headers = Object.keys(records[0] ?? {});
  const visibleHeaders = headers.filter(header => !isHiddenColumn(header));

  const thead = document.getElementById("availability-head");
  const tbody = document.getElementById("availability-body");

  thead.innerHTML = "";
  tbody.innerHTML = "";
  state.responseSelects = [];

  const headRow = document.createElement("tr");

  visibleHeaders.forEach(header => {
    const th = document.createElement("th");
    th.setAttribute("aria-sort", "none");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "sort-button";
    button.dataset.header = header;
    button.innerHTML = `<span>${escapeHtml(header)}</span><span class="sort-indicator" aria-hidden="true">↕</span>`;
    button.addEventListener("click", () => sortCohortsBy(header));

    th.appendChild(button);
    headRow.appendChild(th);
  });

  const responseTh = document.createElement("th");
  responseTh.textContent = "Your response";
  headRow.appendChild(responseTh);

  thead.appendChild(headRow);

  records.forEach((record, index) => {
    const tr = document.createElement("tr");
    tr.dataset.cohortIndex = String(index);

    visibleHeaders.forEach(header => {
      const td = document.createElement("td");
      const rawValue = record[header] ?? "";
      td.textContent = isDateColumn(header)
        ? formatDateWithWeekday(rawValue)
        : rawValue;
      tr.appendChild(td);
    });

    const responseTd = document.createElement("td");
    responseTd.className = "response-cell";

    const select = document.createElement("select");
    select.required = true;
    select.dataset.index = String(index);
    select.innerHTML = `
      <option value="">Select…</option>
      <option value="Preferred">Preferred</option>
      <option value="Available">Available</option>
      <option value="Unavailable">Unavailable</option>
      <option value="GA/TA for this class">GA/TA for this class</option>
    `;

    select.addEventListener("change", updatePreferredCounter);
    responseTd.appendChild(select);
    tr.appendChild(responseTd);

    tbody.appendChild(tr);
    state.responseSelects.push(select);
  });

  updatePreferredCounter();
}

function sortCohortsBy(header) {
  if (state.sort.header === header) {
    state.sort.direction = state.sort.direction === "ascending"
      ? "descending"
      : "ascending";
  } else {
    state.sort.header = header;
    state.sort.direction = "ascending";
  }

  const directionMultiplier = state.sort.direction === "ascending" ? 1 : -1;
  const tbody = document.getElementById("availability-body");
  const rows = Array.from(tbody.rows);

  rows.sort((rowA, rowB) => {
    const indexA = Number(rowA.dataset.cohortIndex);
    const indexB = Number(rowB.dataset.cohortIndex);
    const comparison = compareCohortValues(
      state.cohorts[indexA][header],
      state.cohorts[indexB][header],
      header
    );

    // Keep the original CSV order as a stable tie-breaker.
    return comparison === 0
      ? indexA - indexB
      : comparison * directionMultiplier;
  });

  rows.forEach(row => tbody.appendChild(row));
  updateSortIndicators();
}

function compareCohortValues(valueA, valueB, header) {
  const a = String(valueA ?? "").trim();
  const b = String(valueB ?? "").trim();

  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  if (isDateColumn(header)) {
    const dateA = parseDateForSort(a);
    const dateB = parseDateForSort(b);
    if (dateA !== null && dateB !== null) return dateA - dateB;
  }

  if (isTimeColumn(header)) {
    const timeA = parseTimeForSort(a);
    const timeB = parseTimeForSort(b);
    if (timeA !== null && timeB !== null) return timeA - timeB;
  }

  return naturalCollator.compare(a, b);
}

function parseDateForSort(value) {
  const mdY = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdY) return Date.UTC(Number(mdY[3]), Number(mdY[1]) - 1, Number(mdY[2]));

  const ymd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) return Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isTimeColumn(header) {
  const normalized = normalizeHeader(header);
  return normalized === "start" || normalized === "aes end" || normalized.endsWith(" time");
}

function parseTimeForSort(value) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
  if (!match) return null;

  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === "pm") hour += 12;
  return hour * 60 + Number(match[2]);
}

function updateSortIndicators() {
  document.querySelectorAll(".sort-button").forEach(button => {
    const isActive = button.dataset.header === state.sort.header;
    const th = button.closest("th");
    const indicator = button.querySelector(".sort-indicator");

    th.setAttribute("aria-sort", isActive ? state.sort.direction : "none");
    button.classList.toggle("active", isActive);
    indicator.textContent = isActive
      ? (state.sort.direction === "ascending" ? "↑" : "↓")
      : "↕";
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updatePreferredCounter() {
  const selected = state.responseSelects.filter(
    select => select.value === "Preferred"
  ).length;

  const counter = document.getElementById("preferred-counter");
  counter.textContent = `Preferred: ${selected} / ${CONFIG.requiredPreferredCount}`;
  counter.classList.toggle(
    "complete",
    selected === CONFIG.requiredPreferredCount
  );
}

function validateSelections() {
  if (state.responseSelects.some(select => !select.value)) {
    return "Please choose a response for every testing cohort.";
  }

  const preferredCount = state.responseSelects.filter(
    select => select.value === "Preferred"
  ).length;

  if (preferredCount !== CONFIG.requiredPreferredCount) {
    return `Please select exactly ${CONFIG.requiredPreferredCount} Preferred cohort assignments.`;
  }

  return null;
}

async function handleSubmit(event) {
  event.preventDefault();
  hideError();

  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const selectionError = validateSelections();
  if (selectionError) {
    showError(selectionError);
    return;
  }

  const payload = state.cohorts.map((cohort, index) => ({
    cohort_index: index + 1,
    cohort,
    response: state.responseSelects[index].value
  }));

  document.getElementById("preference-payload").value = JSON.stringify(payload);

  const submitButton = document.getElementById("submit-button");
  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";

  try {
    const formData = new FormData(form);
    const encoded = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      encoded.append(key, value);
    }

    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encoded.toString()
    });

    if (!response.ok) {
      throw new Error("Submission failed. Please try again.");
    }

    form.hidden = true;
    document.getElementById("success-panel").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showError(error.message);
    submitButton.disabled = false;
    submitButton.textContent = "Submit Preferences";
  }
}

function showError(message) {
  const box = document.getElementById("form-error");
  box.textContent = message;
  box.hidden = false;
}

function hideError() {
  const box = document.getElementById("form-error");
  box.hidden = true;
  box.textContent = "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      field = "";

      if (row.some(cell => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some(cell => cell.trim() !== "")) rows.push(row);

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());

  return rows.slice(1).map(values => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] ?? "";
    });
    return obj;
  });
}
