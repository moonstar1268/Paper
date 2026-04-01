const STATUS_STORAGE_KEY = "paper-status-board-status-v1";
const CUSTOM_PAPERS_STORAGE_KEY = "paper-status-board-custom-papers-v1";
const JOURNAL_STORAGE_KEY = "paper-status-board-journal-v1";
const TITLE_STORAGE_KEY = "paper-status-board-title-v1";

const statusOptions = [
  { value: "working", label: "WORKING" },
  { value: "with-editor", label: "WITH EDITOR" },
  { value: "under-review", label: "UNDER REVIEW" },
  { value: "under-rr", label: "UNDER R&R" },
];

const defaultPapers = [
  {
    id: "ceo-digital-background",
    year: 2026,
    title: "CEO digital background and firm value: Evidence from Korea",
    authors:
      "Moonseok Choi, Jeongkwon Seo, Seokjin Choi, and Seung Hun Han",
    targetJournal: "OOO",
    status: "working",
  },
  {
    id: "which-firm-is-less-important",
    year: 2026,
    title:
      "Which firm is less important? Evidence from business group-interlocked independent directors",
    authors:
      "Moonseok Choi, Jeongkwon Seo, Seokjin Choi, and Seung Hun Han",
    targetJournal: "OOO",
    status: "working",
  },
  {
    id: "betting-on-chaos",
    year: 2026,
    title: "Betting on Chaos: Political uncertainty and lottery demand",
    authors: "Moonseok Choi, Jeongkwon Seo, and Seung Hun Han",
    targetJournal: "OOO",
    status: "under-review",
  },
  {
    id: "ceo-power-long-term-compensation",
    year: 2026,
    title:
      "CEO facial masculinity, CEO power, and long-term compensation: Moderating role of monitoring intensity",
    authors:
      "Moonseok Choi, Jeongkwon Seo, Dongjoon Kim, Seokjin Choi, and Seung Hun Han",
    targetJournal: "OOO",
    status: "under-rr",
  },
];

const paperList = document.querySelector("#paperList");
const summaryGrid = document.querySelector("#summaryGrid");
const template = document.querySelector("#paperCardTemplate");
const addPaperForm = document.querySelector("#addPaperForm");
const newPaperYearInput = document.querySelector("#newPaperYear");
const newPaperStatusSelect = document.querySelector("#newPaperStatus");
const newPaperTitleInput = document.querySelector("#newPaperTitle");
const newPaperAuthorsInput = document.querySelector("#newPaperAuthors");
const newPaperJournalInput = document.querySelector("#newPaperJournal");

function loadStoredStatuses() {
  try {
    return JSON.parse(localStorage.getItem(STATUS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStatus(id, status) {
  const stored = loadStoredStatuses();
  stored[id] = status;
  localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(stored));
}

function loadCustomPapers() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_PAPERS_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadStoredJournals() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function loadStoredTitles() {
  try {
    return JSON.parse(localStorage.getItem(TITLE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCustomPapers(customPapers) {
  localStorage.setItem(
    CUSTOM_PAPERS_STORAGE_KEY,
    JSON.stringify(customPapers),
  );
}

function saveJournal(id, journal) {
  const stored = loadStoredJournals();
  stored[id] = journal;
  localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(stored));
}

function saveTitle(id, title) {
  const stored = loadStoredTitles();
  stored[id] = title;
  localStorage.setItem(TITLE_STORAGE_KEY, JSON.stringify(stored));
}

function getAllPapers() {
  return [...defaultPapers, ...loadCustomPapers()];
}

function getPaperStatus(paper) {
  const stored = loadStoredStatuses();
  return stored[paper.id] || paper.status;
}

function getPaperJournal(paper) {
  const stored = loadStoredJournals();
  return stored[paper.id] || paper.targetJournal || "OOO";
}

function getPaperTitle(paper) {
  const stored = loadStoredTitles();
  return stored[paper.id] || paper.title;
}

function populateStatusSelect(select, selectedValue) {
  select.innerHTML = "";

  for (const option of statusOptions) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    element.selected = option.value === selectedValue;
    select.append(element);
  }
}

function updateSummary() {
  const papers = getAllPapers();
  const counts = {
    total: papers.length,
    working: 0,
    "with-editor": 0,
    "under-review": 0,
    "under-rr": 0,
  };

  for (const paper of papers) {
    counts[getPaperStatus(paper)] += 1;
  }

  const items = [
    { value: counts.total, label: "Total Papers" },
    { value: counts.working, label: "Working" },
    { value: counts["with-editor"], label: "With Editor" },
    { value: counts["under-review"], label: "Under Review" },
    { value: counts["under-rr"], label: "Under R&R" },
  ];

  summaryGrid.innerHTML = "";

  for (const item of items) {
    const card = document.createElement("div");
    card.className = "summary-item";
    card.innerHTML = `<strong>${item.value}</strong><span>${item.label}</span>`;
    summaryGrid.append(card);
  }
}

function renderPapers() {
  const papers = getAllPapers();
  paperList.innerHTML = "";

  for (const paper of papers) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".paper-card");
    const yearBadge = fragment.querySelector(".year-badge");
    const journalInput = fragment.querySelector(".journal-input");
    const title = fragment.querySelector(".paper-title");
    const editTitleButton = fragment.querySelector(".edit-title-button");
    const authors = fragment.querySelector(".paper-authors");
    const statusField = fragment.querySelector(".status-field");
    const selectedStatus = getPaperStatus(paper);
    const selectedJournal = getPaperJournal(paper);
    const selectedTitle = getPaperTitle(paper);
    const select = document.createElement("select");

    select.className = "status-select";
    select.setAttribute("aria-label", "논문 상태 선택");
    populateStatusSelect(select, selectedStatus);

    card.dataset.status = selectedStatus;
    yearBadge.textContent = paper.year;
    journalInput.value = selectedJournal;
    title.textContent = selectedTitle;
    authors.innerHTML = `<strong>Authors:</strong> ${paper.authors}`;

    select.addEventListener("change", (event) => {
      const nextStatus = event.target.value;
      card.dataset.status = nextStatus;
      saveStatus(paper.id, nextStatus);
      updateSummary();
    });

    journalInput.addEventListener("blur", (event) => {
      const normalizedJournal = event.target.value.trim() || "OOO";
      event.target.value = normalizedJournal;
      saveJournal(paper.id, normalizedJournal);
    });

    editTitleButton.addEventListener("click", () => {
      const nextTitle = window.prompt(
        "새 논문 제목을 입력하세요.",
        getPaperTitle(paper),
      );

      if (nextTitle === null) {
        return;
      }

      const normalizedTitle = nextTitle.trim();

      if (!normalizedTitle) {
        return;
      }

      title.textContent = normalizedTitle;
      saveTitle(paper.id, normalizedTitle);
    });

    statusField.replaceChild(select, statusField.querySelector(".status-select"));
    paperList.append(fragment);
  }
}

function createPaperId(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${slug || "paper"}-${Date.now().toString(36)}`;
}

function setInitialFormValues() {
  newPaperYearInput.value = String(new Date().getFullYear());
  populateStatusSelect(newPaperStatusSelect, "working");
}

addPaperForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = newPaperTitleInput.value.trim();
  const authors = newPaperAuthorsInput.value.trim();
  const targetJournal = newPaperJournalInput.value.trim() || "OOO";
  const year = Number(newPaperYearInput.value);
  const status = newPaperStatusSelect.value;

  if (!title || !authors || !year) {
    return;
  }

  const newPaper = {
    id: createPaperId(title),
    year,
    title,
    authors,
    targetJournal,
    status,
  };

  const customPapers = loadCustomPapers();
  customPapers.push(newPaper);
  saveCustomPapers(customPapers);
  saveStatus(newPaper.id, status);
  saveJournal(newPaper.id, targetJournal);
  saveTitle(newPaper.id, title);

  renderPapers();
  updateSummary();

  addPaperForm.reset();
  setInitialFormValues();
  paperList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
});

setInitialFormValues();
renderPapers();
updateSummary();
