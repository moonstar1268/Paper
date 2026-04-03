const APP_CONFIG = window.APP_CONFIG || {};

const STATUS_STORAGE_KEY = "paper-status-board-status-v1";
const CUSTOM_PAPERS_STORAGE_KEY = "paper-status-board-custom-papers-v1";
const JOURNAL_STORAGE_KEY = "paper-status-board-journal-v1";
const TITLE_STORAGE_KEY = "paper-status-board-title-v1";
const DELETED_STORAGE_KEY = "paper-status-board-deleted-v1";

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
const modePill = document.querySelector("#modePill");
const newPaperYearInput = document.querySelector("#newPaperYear");
const newPaperStatusSelect = document.querySelector("#newPaperStatus");
const newPaperTitleInput = document.querySelector("#newPaperTitle");
const newPaperAuthorsInput = document.querySelector("#newPaperAuthors");
const newPaperJournalInput = document.querySelector("#newPaperJournal");

const state = {
  papers: [],
  sharedMode: Boolean(
    window.supabase &&
      APP_CONFIG.supabaseUrl &&
      APP_CONFIG.supabaseAnonKey,
  ),
  supabase: null,
  realtimeChannel: null,
};

function loadStoredObject(key, fallbackValue) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallbackValue));
  } catch {
    return fallbackValue;
  }
}

function saveStoredObject(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function buildLocalPapers() {
  const storedStatuses = loadStoredObject(STATUS_STORAGE_KEY, {});
  const storedJournals = loadStoredObject(JOURNAL_STORAGE_KEY, {});
  const storedTitles = loadStoredObject(TITLE_STORAGE_KEY, {});
  const customPapers = loadStoredObject(CUSTOM_PAPERS_STORAGE_KEY, []);
  const deletedPaperIds = loadStoredObject(DELETED_STORAGE_KEY, {});

  return [...defaultPapers, ...customPapers]
    .filter((paper) => !deletedPaperIds[paper.id])
    .map((paper) => ({
      ...paper,
      status: storedStatuses[paper.id] || paper.status,
      targetJournal: storedJournals[paper.id] || paper.targetJournal || "OOO",
      title: storedTitles[paper.id] || paper.title,
    }));
}

function saveLocalStatus(id, status) {
  const storedStatuses = loadStoredObject(STATUS_STORAGE_KEY, {});
  storedStatuses[id] = status;
  saveStoredObject(STATUS_STORAGE_KEY, storedStatuses);
}

function saveLocalJournal(id, targetJournal) {
  const storedJournals = loadStoredObject(JOURNAL_STORAGE_KEY, {});
  storedJournals[id] = targetJournal;
  saveStoredObject(JOURNAL_STORAGE_KEY, storedJournals);
}

function saveLocalTitle(id, title) {
  const storedTitles = loadStoredObject(TITLE_STORAGE_KEY, {});
  storedTitles[id] = title;
  saveStoredObject(TITLE_STORAGE_KEY, storedTitles);
}

function saveLocalCustomPaper(paper) {
  const customPapers = loadStoredObject(CUSTOM_PAPERS_STORAGE_KEY, []);
  customPapers.push(paper);
  saveStoredObject(CUSTOM_PAPERS_STORAGE_KEY, customPapers);
}

function removeFromStoredMap(key, paperId) {
  const storedMap = loadStoredObject(key, {});
  delete storedMap[paperId];
  saveStoredObject(key, storedMap);
}

function deleteLocalPaper(paperId) {
  const deletedPaperIds = loadStoredObject(DELETED_STORAGE_KEY, {});
  deletedPaperIds[paperId] = true;
  saveStoredObject(DELETED_STORAGE_KEY, deletedPaperIds);

  const customPapers = loadStoredObject(CUSTOM_PAPERS_STORAGE_KEY, []).filter(
    (paper) => paper.id !== paperId,
  );
  saveStoredObject(CUSTOM_PAPERS_STORAGE_KEY, customPapers);

  removeFromStoredMap(STATUS_STORAGE_KEY, paperId);
  removeFromStoredMap(JOURNAL_STORAGE_KEY, paperId);
  removeFromStoredMap(TITLE_STORAGE_KEY, paperId);
}

function normalizeSharedPaper(row) {
  return {
    id: row.id,
    year: row.year,
    title: row.title,
    authors: row.authors,
    targetJournal: row.target_journal || "OOO",
    status: row.status,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
  };
}

function updateModePill(message) {
  modePill.textContent = message;
}

function populateStatusSelect(select, selectedValue) {
  select.innerHTML = "";

  for (const option of statusOptions) {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    optionElement.selected = option.value === selectedValue;
    select.append(optionElement);
  }
}

function setInitialFormValues() {
  newPaperYearInput.value = String(new Date().getFullYear());
  newPaperJournalInput.value = "OOO";
  populateStatusSelect(newPaperStatusSelect, "working");
}

function updatePaperInState(paperId, patch) {
  state.papers = state.papers.map((paper) =>
    paper.id === paperId ? { ...paper, ...patch } : paper,
  );
}

function updateSummary() {
  const counts = {
    total: state.papers.length,
    working: 0,
    "with-editor": 0,
    "under-review": 0,
    "under-rr": 0,
  };

  for (const paper of state.papers) {
    counts[paper.status] += 1;
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
  paperList.innerHTML = "";

  for (const paper of state.papers) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".paper-card");
    const yearBadge = fragment.querySelector(".year-badge");
    const journalInput = fragment.querySelector(".journal-input");
    const title = fragment.querySelector(".paper-title");
    const editTitleButton = fragment.querySelector(".edit-title-button");
    const deletePaperButton = fragment.querySelector(".delete-paper-button");
    const authors = fragment.querySelector(".paper-authors");
    const statusField = fragment.querySelector(".status-field");
    const select = document.createElement("select");

    select.className = "status-select";
    select.setAttribute("aria-label", "논문 상태 선택");
    populateStatusSelect(select, paper.status);

    card.dataset.status = paper.status;
    yearBadge.textContent = paper.year;
    journalInput.value = paper.targetJournal || "OOO";
    title.textContent = paper.title;
    authors.innerHTML = `<strong>Authors:</strong> ${paper.authors}`;

    select.addEventListener("change", async (event) => {
      const nextStatus = event.target.value;
      card.dataset.status = nextStatus;
      updatePaperInState(paper.id, { status: nextStatus });
      updateSummary();

      const success = await persistPaperUpdate(paper.id, { status: nextStatus });

      if (!success) {
        await reloadFromSource();
      }
    });

    journalInput.addEventListener("blur", async (event) => {
      const normalizedJournal = event.target.value.trim() || "OOO";
      event.target.value = normalizedJournal;
      updatePaperInState(paper.id, { targetJournal: normalizedJournal });

      const success = await persistPaperUpdate(paper.id, {
        targetJournal: normalizedJournal,
      });

      if (!success) {
        await reloadFromSource();
      }
    });

    editTitleButton.addEventListener("click", async () => {
      const nextTitle = window.prompt("새 논문 제목을 입력하세요.", paper.title);

      if (nextTitle === null) {
        return;
      }

      const normalizedTitle = nextTitle.trim();

      if (!normalizedTitle) {
        return;
      }

      title.textContent = normalizedTitle;
      updatePaperInState(paper.id, { title: normalizedTitle });

      const success = await persistPaperUpdate(paper.id, {
        title: normalizedTitle,
      });

      if (!success) {
        await reloadFromSource();
      }
    });

    deletePaperButton.addEventListener("click", async () => {
      const confirmed = window.confirm(
        `"${paper.title}" 논문을 삭제하시겠습니까?`,
      );

      if (!confirmed) {
        return;
      }

      const success = await deletePaper(paper.id);

      if (!success) {
        return;
      }

      await reloadFromSource();
    });

    statusField.replaceChild(select, statusField.querySelector(".status-select"));
    paperList.append(fragment);
  }
}

async function loadSharedPapers() {
  const { data, error } = await state.supabase
    .from("papers")
    .select("id, year, title, authors, target_journal, status, sort_order, created_at")
    .order("year", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    throw error;
  }

  state.papers = data.map(normalizeSharedPaper);
}

function subscribeToRealtimeUpdates() {
  if (state.realtimeChannel) {
    return;
  }

  state.realtimeChannel = state.supabase
    .channel("papers-live-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "papers" },
      async () => {
        await reloadFromSource();
      },
    )
    .subscribe();
}

async function reloadFromSource() {
  if (state.sharedMode) {
    await loadSharedPapers();
  } else {
    state.papers = buildLocalPapers();
  }

  renderPapers();
  updateSummary();
}

async function persistPaperUpdate(paperId, patch) {
  if (state.sharedMode) {
    const sharedPatch = {};

    if (patch.status) {
      sharedPatch.status = patch.status;
    }

    if (patch.targetJournal) {
      sharedPatch.target_journal = patch.targetJournal;
    }

    if (patch.title) {
      sharedPatch.title = patch.title;
    }

    const { error } = await state.supabase
      .from("papers")
      .update(sharedPatch)
      .eq("id", paperId);

    if (error) {
      console.error(error);
      window.alert("Supabase 저장에 실패했습니다. 설정 또는 권한을 확인해주세요.");
      return false;
    }

    return true;
  }

  if (patch.status) {
    saveLocalStatus(paperId, patch.status);
  }

  if (patch.targetJournal) {
    saveLocalJournal(paperId, patch.targetJournal);
  }

  if (patch.title) {
    saveLocalTitle(paperId, patch.title);
  }

  return true;
}

async function deletePaper(paperId) {
  if (state.sharedMode) {
    const { error } = await state.supabase
      .from("papers")
      .delete()
      .eq("id", paperId);

    if (error) {
      console.error(error);
      window.alert(
        "논문 삭제에 실패했습니다. Supabase delete 정책을 다시 적용해주세요.",
      );
      return false;
    }

    return true;
  }

  deleteLocalPaper(paperId);
  return true;
}

function createLocalPaperId(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${slug || "paper"}-${Date.now().toString(36)}`;
}

function getNextSortOrder() {
  if (!state.papers.length) {
    return 1;
  }

  return (
    Math.max(
      ...state.papers.map((paper) => Number(paper.sortOrder || 0)),
    ) + 1
  );
}

addPaperForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = newPaperTitleInput.value.trim();
  const authors = newPaperAuthorsInput.value.trim();
  const targetJournal = newPaperJournalInput.value.trim() || "OOO";
  const year = Number(newPaperYearInput.value);
  const status = newPaperStatusSelect.value;

  if (!title || !authors || !year) {
    return;
  }

  if (state.sharedMode) {
    const { error } = await state.supabase.from("papers").insert({
      year,
      title,
      authors,
      target_journal: targetJournal,
      status,
      sort_order: getNextSortOrder(),
    });

    if (error) {
      console.error(error);
      window.alert("새 논문 저장에 실패했습니다. Supabase 설정을 확인해주세요.");
      return;
    }
  } else {
    const newPaper = {
      id: createLocalPaperId(title),
      year,
      title,
      authors,
      targetJournal,
      status,
    };

    saveLocalCustomPaper(newPaper);
    saveLocalStatus(newPaper.id, status);
    saveLocalJournal(newPaper.id, targetJournal);
    saveLocalTitle(newPaper.id, title);
  }

  addPaperForm.reset();
  setInitialFormValues();
  await reloadFromSource();
  paperList.lastElementChild?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
});

async function initializeApp() {
  setInitialFormValues();

  if (state.sharedMode) {
    state.supabase = window.supabase.createClient(
      APP_CONFIG.supabaseUrl,
      APP_CONFIG.supabaseAnonKey,
    );

    try {
      await loadSharedPapers();
      subscribeToRealtimeUpdates();
      updateModePill("Shared mode: Supabase realtime sync is active.");
    } catch {
      state.sharedMode = false;
      state.supabase = null;
      state.papers = buildLocalPapers();
      updateModePill(
        "Local mode: Supabase connection failed, so this browser is saving locally.",
      );
    }
  } else {
    state.papers = buildLocalPapers();
    updateModePill(
      "Local mode: changes stay in this browser until Supabase is configured.",
    );
  }

  renderPapers();
  updateSummary();
}

initializeApp();
