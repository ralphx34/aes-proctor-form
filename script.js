const CONFIG = {
  examPeriod: "Midterm 1",
  cohortCsv: "cohort.csv",
  requiredPreferredCount: 3,

  // These columns are hidden from proctors.
  hiddenColumns: ["Room Size", "room size", "room_size", "AES Students", "aes students", "aes_students"]
};

const state = {
  cohorts: [],
  responseSelects: []
};

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
    th.textContent = header;
    headRow.appendChild(th);
  });

  const responseTh = document.createElement("th");
  responseTh.textContent = "Your response";
  headRow.appendChild(responseTh);

  thead.appendChild(headRow);

  records.forEach((record, index) => {
    const tr = document.createElement("tr");

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
