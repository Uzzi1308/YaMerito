const lanes = [
  { id: "inbox", label: "Planeando" },
  { id: "creative", label: "Diseñando" },
  { id: "review", label: "Revisión" },
  { id: "done", label: "Entregado" }
];

const seed = {
  tasks: [],
  ideas: [],
  water: { count: 0, date: getDateKey() },
  timer: { minutes: 25, remaining: 25 * 60, running: false, completed: 0, completedDate: getDateKey(), history: {} },
  reports: { dailyShown: "", weeklyShown: "" }
};

const storeKey = "atelier-marketing-dashboard-v2";
const themeKey = "atelier-marketing-theme";
const mascotKey = "atelier-marketing-mascot";
let state = loadState();
let activeFilter = "Todas";
let activeView = "flow";
let draggedId = null;
let timerInterval = null;

const laneWrap = document.querySelector("#lanes");
const template = document.querySelector("#taskTemplate");
const form = document.querySelector("#taskForm");
const chips = [...document.querySelectorAll(".filter-group .chip")];
const ideasList = document.querySelector("#ideasList");
const timerDisplay = document.querySelector("#timerDisplay");
const timerMode = document.querySelector("#timerMode");
const timerRing = document.querySelector("#timerRing");
const timerStart = document.querySelector("#timerStart");
const timerReset = document.querySelector("#timerReset");
const timerPresets = [...document.querySelectorAll("[data-minutes]")];
const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];
const waterCount = document.querySelector("#waterCount");
const reportModal = document.querySelector("#reportModal");
const reportKicker = document.querySelector("#reportKicker");
const reportTitle = document.querySelector("#reportTitle");
const reportStats = document.querySelector("#reportStats");
const reportMessage = document.querySelector("#reportMessage");
const mascotImage = document.querySelector("#mascotImage");
const mascotBubble = document.querySelector("#mascotBubble");
const mascotSelect = document.querySelector("#mascotSelect");
const dogGift = document.querySelector("#dogGift");
const dogCard = document.querySelector("#dogCard");
const dogImage = document.querySelector("#dogImage");
const dogCaption = document.querySelector("#dogCaption");

const mascotSprites = {
  dog: "./assets/mascots/dog.png",
  penguin: "./assets/mascots/penguin.png",
  fox: "./assets/mascots/fox.png",
  duck: "./assets/mascots/duck.png",
  dino: "./assets/mascots/dino.png"
};

function loadState() {
  const saved = localStorage.getItem(storeKey);
  if (!saved) return structuredClone(seed);
  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return structuredClone(seed);
  }
}

function normalizeState(savedState) {
  const timer = { ...seed.timer, ...(savedState.timer || {}) };
  timer.history = timer.history || {};
  const stateDate = timer.completedDate || getDateKey();
  if (stateDate !== getDateKey()) {
    timer.completed = 0;
    timer.completedDate = getDateKey();
  }
  return {
    ...seed,
    ...savedState,
    timer,
    water: normalizeWater(savedState.water),
    reports: { ...seed.reports, ...(savedState.reports || {}) }
  };
}

function normalizeWater(savedWater = {}) {
  const water = { ...seed.water, ...savedWater };
  if (water.date !== getDateKey()) {
    water.count = 0;
    water.date = getDateKey();
  }
  return water;
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
  themeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeChoice === theme);
  });
}

function render() {
  renderBoard();
  renderIdeas();
  renderWater();
  renderTimer();
  renderStats();
  renderMascot();
  saveState();
}

function visibleTasks() {
  let tasks = state.tasks;
  if (activeView === "today") {
    tasks = tasks.filter((task) => isTodayOrOverdue(task.due) && task.lane !== "done");
  }
  if (activeView === "week") {
    tasks = tasks.filter((task) => isThisWeek(task.due) && task.lane !== "done");
  }
  if (activeFilter === "Todas") return tasks;
  return tasks.filter((task) => task.priority === activeFilter);
}

function renderBoard() {
  laneWrap.innerHTML = "";
  const tasks = visibleTasks();

  lanes.forEach((lane) => {
    const laneEl = document.createElement("section");
    laneEl.className = "lane";
    laneEl.dataset.lane = lane.id;
    laneEl.innerHTML = `<div class="lane__title"><span>${lane.label}</span><span>${tasks.filter((task) => task.lane === lane.id).length}</span></div>`;
    laneEl.addEventListener("dragover", onDragOver);
    laneEl.addEventListener("dragleave", () => laneEl.classList.remove("is-over"));
    laneEl.addEventListener("drop", onDrop);

    tasks.filter((task) => task.lane === lane.id).forEach((task) => {
      laneEl.appendChild(createTaskCard(task));
    });

    if (!tasks.some((task) => task.lane === lane.id)) {
      const empty = document.createElement("p");
      empty.className = "empty-lane";
      empty.textContent = "Sin tareas todavía";
      laneEl.appendChild(empty);
    }

    laneWrap.appendChild(laneEl);
  });
}

function createTaskCard(task) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;
  node.dataset.priority = task.priority;
  node.querySelector(".pill").textContent = task.priority;
  node.querySelector(".pill").dataset.priority = task.priority;
  node.querySelector("h3").textContent = task.title;
  node.querySelector("p").textContent = task.project || "Sin proyecto asignado";
  node.querySelector(".type").textContent = task.type;
  node.querySelector(".task-card__date").textContent = formatDueDate(task.due);
  const approvalSelect = node.querySelector(".approval-control select");
  approvalSelect.value = task.approval || "Pendiente";
  approvalSelect.dataset.approval = approvalSelect.value;
  const taskLink = node.querySelector(".task-link");
  if (task.link) {
    taskLink.href = normalizeUrl(task.link);
  } else {
    taskLink.remove();
  }
  const noteInput = node.querySelector(".task-note textarea");
  noteInput.value = task.notes || "";

  node.addEventListener("dragstart", () => {
    draggedId = task.id;
    node.classList.add("dragging");
  });
  node.addEventListener("dragend", () => {
    draggedId = null;
    node.classList.remove("dragging");
  });
  node.querySelector(".task-delete").addEventListener("click", () => {
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
    render();
  });
  node.querySelector(".next-step").addEventListener("click", () => {
    const current = lanes.findIndex((lane) => lane.id === task.lane);
    task.lane = lanes[Math.min(current + 1, lanes.length - 1)].id;
    stampDelivered(task);
    render();
  });
  noteInput.addEventListener("input", (event) => {
    task.notes = event.target.value;
    saveState();
  });
  approvalSelect.addEventListener("change", (event) => {
    task.approval = event.target.value;
    event.target.dataset.approval = event.target.value;
    saveState();
  });

  return node;
}

function onDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("is-over");
}

function onDrop(event) {
  event.preventDefault();
  const lane = event.currentTarget.dataset.lane;
  const task = state.tasks.find((item) => item.id === draggedId);
  if (task) {
    task.lane = lane;
    stampDelivered(task);
  }
  event.currentTarget.classList.remove("is-over");
  render();
}

function renderIdeas() {
  ideasList.innerHTML = "";
  if (!state.ideas.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Guarda ideas sueltas para campañas, copies o referencias.";
    ideasList.appendChild(empty);
    return;
  }

  state.ideas.forEach((idea, index) => {
    const row = document.createElement("div");
    row.className = "idea";
    row.innerHTML = `<input aria-label="Idea rapida" value="${escapeHtml(idea)}" />`;
    row.querySelector("input").addEventListener("input", (event) => {
      state.ideas[index] = event.target.value;
      saveState();
    });
    ideasList.appendChild(row);
  });
}

function renderWater() {
  syncWaterDay();
  waterCount.textContent = state.water.count;
}

function renderStats() {
  const active = state.tasks.filter((task) => task.lane !== "done").length;
  const hot = state.tasks.filter((task) => task.priority === "Alta" && task.lane !== "done").length;
  const done = state.tasks.filter((task) => task.lane === "done").length;
  document.querySelector("#statActive").textContent = active;
  document.querySelector("#statHot").textContent = hot;
  document.querySelector("#statDone").textContent = done;

  const focus = state.tasks.find((task) => isTodayOrOverdue(task.due) && task.lane !== "done")
    || state.tasks.find((task) => task.priority === "Alta" && task.lane !== "done")
    || state.tasks.find((task) => task.lane !== "done");
  document.querySelector("#focusText").textContent = focus ? focus.title : "Agrega una tarea para elegir el foco";
}

function renderTimer() {
  syncPomodoroDay();
  const total = state.timer.minutes * 60;
  const remaining = Math.max(0, state.timer.remaining);
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  const progress = 360 - Math.round((remaining / total) * 360);

  timerDisplay.textContent = `${minutes}:${seconds}`;
  timerMode.textContent = state.timer.minutes === 25 ? "Pomodoro" : state.timer.minutes === 5 ? "Descanso corto" : "Descanso largo";
  document.querySelector("#pomodoroSessions").textContent = state.timer.completed;
  timerRing.style.setProperty("--progress", `${progress}deg`);
  timerStart.innerHTML = state.timer.running
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>Pausar`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>Iniciar`;
  timerPresets.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.minutes) === state.timer.minutes);
  });
}

function setTimer(minutes) {
  pauseTimer();
  state.timer = { ...state.timer, minutes, remaining: minutes * 60, running: false };
  render();
}

function toggleTimer() {
  state.timer.running ? pauseTimer() : startTimer();
  render();
}

function startTimer() {
  if (timerInterval) return;
  syncPomodoroDay();
  state.timer.running = true;
  timerInterval = setInterval(() => {
    state.timer.remaining -= 1;
    if (state.timer.remaining <= 0) {
      state.timer.remaining = 0;
      if (state.timer.minutes === 25) {
        state.timer.completed += 1;
        state.timer.completedDate = getDateKey();
        state.timer.history[getDateKey()] = (state.timer.history[getDateKey()] || 0) + 1;
        showMascotMessage("Bloque de enfoque completado. Bien hecho.");
      }
      pauseTimer();
    }
    render();
  }, 1000);
}

function pauseTimer() {
  state.timer.running = false;
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  state.timer.remaining = state.timer.minutes * 60;
  render();
}

function getDateKey() {
  return formatDateKey(new Date());
}

function syncPomodoroDay() {
  if (state.timer.completedDate !== getDateKey()) {
    state.timer.completed = 0;
    state.timer.completedDate = getDateKey();
  }
  state.timer.history = state.timer.history || {};
}

function syncWaterDay() {
  if (state.water.date !== getDateKey()) {
    state.water.count = 0;
    state.water.date = getDateKey();
  }
}

function stampDelivered(task) {
  if (task.lane === "done" && !task.deliveredAt) {
    task.deliveredAt = new Date().toISOString();
    showMascotMessage("Otra tarea entregada. Eso cuenta mucho.");
  }
  if (task.lane !== "done") {
    task.deliveredAt = "";
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function normalizeUrl(value) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function isTodayOrOverdue(dateValue) {
  if (!dateValue) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dateValue}T00:00:00`);
  return due <= today;
}

function isThisWeek(dateValue) {
  if (!dateValue) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const due = new Date(`${dateValue}T00:00:00`);
  return due >= today && due <= weekEnd;
}

function formatDueDate(dateValue) {
  if (!dateValue) return "Sin fecha de entrega";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const due = new Date(`${dateValue}T00:00:00`);
  const label = due < today ? "Venció" : due.getTime() === today.getTime() ? "Entrega hoy" : due.getTime() === tomorrow.getTime() ? "Entrega mañana" : "Entrega";
  return `${label}: ${due.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  state.tasks.unshift({
    id: crypto.randomUUID(),
    title: data.get("title").trim(),
    project: data.get("project").trim(),
    type: data.get("type"),
    priority: data.get("priority"),
    due: data.get("due"),
    approval: data.get("approval"),
    link: data.get("link").trim(),
    notes: data.get("notes").trim(),
    lane: "inbox"
  });
  form.reset();
  document.querySelector("#taskPriority").value = "Media";
  render();
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter;
    chips.forEach((item) => item.classList.toggle("is-active", item === chip));
    renderBoard();
  });
});

document.querySelector("#addIdea").addEventListener("click", () => {
  state.ideas.unshift("");
  render();
  const firstIdea = document.querySelector(".idea input");
  if (firstIdea) firstIdea.focus();
});

document.querySelector("#resetData").addEventListener("click", () => {
  state = structuredClone(seed);
  pauseTimer();
  render();
});

document.querySelector("#addWater").addEventListener("click", () => {
  syncWaterDay();
  state.water.count += 1;
  showMascotMessage("Bien. Agua tomada, mente más clara.");
  render();
});

document.querySelector("#resetWater").addEventListener("click", () => {
  state.water = { count: 0, date: getDateKey() };
  render();
});

dogGift.addEventListener("click", fetchDogGift);

document.querySelector("#testReport").addEventListener("click", () => {
  showReport("daily", true);
});

document.querySelector("#closeReport").addEventListener("click", closeReport);

reportModal.addEventListener("click", (event) => {
  if (event.target === reportModal) closeReport();
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.themeChoice);
  });
});

mascotSelect.addEventListener("change", () => {
  localStorage.setItem(mascotKey, mascotSelect.value);
  renderMascot();
  showMascotMessage("Listo para acompañarte hoy.");
});

document.querySelector("#mascotButton").addEventListener("click", () => {
  const messages = [
    "Vamos una cosa a la vez.",
    "No tienes que resolver todo de golpe.",
    "Hoy con calma también cuenta.",
    "Respira. Lo estás haciendo bien.",
    "Te quiero mucho.",
    "Estoy muy orgulloso de ti.",
    "Lo estás haciendo mejor de lo que crees.",
    "Un pasito más y a descansar.",
    "Hoy también mereces calma.",
    "Tú puedes con esto.",
    "No olvides tomar agüita.",
    "Te esfuerzas muchisimo",
    "Corazón para ti.",
    "Eres increíble.",
    "Con calma, amor. Vas muy bien.",
    "Te mando un abrazoteeeee.",
    "Estoy contigo, incluso en los días pesados.",
    "Un pendiente menos también es victoria.",
    "Eres super creativa",
    "No te presiones de más.",
    "Te quiero, y me encanta verte crecer.",
    "Eres increibleeeeee!",
    "Paso a paso.",
    "Respira tantito. Todo va tomando forma.",
    "Qué bonito verte construir cosas.",
    "Tu calma también es importante.",
    "Estoy aquí echándote porras.",
    "Te mereces una pausa bonita.",
    "Vas muy bien, aunque el día se sienta largo.",
    "Un corazoncito para ti.",
    "Acuérdate: no estás sola.",
    "Me gusta mucho cómo le echas ganas.",
    "Primero respira, luego seguimos.",
    "💜",
    "🪻",
    "🌻",
    "✨",
    "🫶",
    "💫",
    "🌷",
    "☀️"
  ];
  mascotImage.classList.remove("is-bouncing");
  void mascotImage.offsetWidth;
  mascotImage.classList.add("is-bouncing");
  showMascotMessage(messages[Math.floor(Math.random() * messages.length)]);
});

timerPresets.forEach((button) => {
  button.addEventListener("click", () => {
    setTimer(Number(button.dataset.minutes));
  });
});

timerStart.addEventListener("click", toggleTimer);
timerReset.addEventListener("click", resetTimer);

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("is-active", item === button));
    renderBoard();
  });
});

if (state.timer?.running) {
  state.timer.running = false;
}

applyTheme(localStorage.getItem(themeKey) || "light");
render();
checkScheduledReports();
setInterval(checkScheduledReports, 60 * 1000);

function renderMascot() {
  const selected = localStorage.getItem(mascotKey) || "dog";
  mascotSelect.value = selected;
  mascotImage.src = mascotSprites[selected] || mascotSprites.dog;
}

function showMascotMessage(message) {
  mascotBubble.textContent = message;
  mascotBubble.classList.add("is-visible");
  clearTimeout(showMascotMessage.timeout);
  showMascotMessage.timeout = setTimeout(() => {
    mascotBubble.classList.remove("is-visible");
  }, 4200);
}

async function fetchDogGift() {
  dogGift.disabled = true;
  dogGift.querySelector("span").textContent = "Buscando perrito...";
  dogCaption.textContent = "Abriendo regalito...";
  dogCard.hidden = false;

  try {
    const response = await fetch("https://dog.ceo/api/breeds/image/random");
    if (!response.ok) throw new Error("No se pudo cargar el perrito");
    const data = await response.json();
    dogImage.src = data.message;
    dogCaption.textContent = getDogBreedName(data.message);
    showMascotMessage("Perrito sorpresa desbloqueado.");
  } catch {
    dogCaption.textContent = "No cargó el perrito. Inténtalo otra vez.";
    showMascotMessage("El perrito se tardó tantito. Probemos otra vez.");
  } finally {
    dogGift.disabled = false;
    dogGift.querySelector("span").textContent = "Otro perrito sorpresa";
  }
}

function getDogBreedName(imageUrl) {
  const match = imageUrl.match(/\/breeds\/([^/]+)\//);
  if (!match) return "sorpresa";
  return match[1]
    .split("-")
    .reverse()
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function checkScheduledReports() {
  const now = new Date();
  const todayKey = getDateKey();
  const isAfterDailyClose = now.getHours() >= 18;
  const isFriday = now.getDay() === 5;

  if (isFriday && isAfterDailyClose && state.reports.weeklyShown !== getWeekKey(now)) {
    showReport("weekly");
    state.reports.weeklyShown = getWeekKey(now);
    saveState();
    return;
  }

  if (isAfterDailyClose && state.reports.dailyShown !== todayKey) {
    showReport("daily");
    state.reports.dailyShown = todayKey;
    saveState();
  }
}

function showReport(type, preview = false) {
  const report = type === "weekly" ? buildWeeklyReport() : buildDailyReport();
  reportKicker.textContent = report.kicker;
  reportTitle.textContent = report.title;
  reportStats.innerHTML = report.items.map((item) => `<li><strong>${item.value}</strong><span>${item.label}</span></li>`).join("");
  reportMessage.textContent = report.message;
  reportModal.classList.add("is-open");
  reportModal.setAttribute("aria-hidden", "false");
}

function closeReport() {
  reportModal.classList.remove("is-open");
  reportModal.setAttribute("aria-hidden", "true");
}

function buildDailyReport() {
  const todayKey = getDateKey();
  const closed = state.tasks.filter((task) => dateKeyFromIso(task.deliveredAt) === todayKey).length;
  const active = state.tasks.filter((task) => task.lane !== "done").length;
  const urgent = state.tasks.filter((task) => task.priority === "Alta" && task.lane !== "done").length;
  const blocked = state.tasks.filter((task) => task.approval === "Cambios" && task.lane !== "done").length;
  const sessions = state.timer.history?.[todayKey] || state.timer.completed || 0;

  return {
    kicker: "Cierre del día",
    title: "Hoy avanzaste más de lo que parece.",
    message: "Buen cierre. Descansa, mañana será un buen día.",
    items: [
      { value: closed, label: "tareas cerradas" },
      { value: active, label: "pendientes en movimiento" },
      { value: urgent, label: "urgentes para cuidar" },
      { value: blocked, label: "con cambios por resolver" },
      { value: sessions, label: "sesiones de enfoque" }
    ]
  };
}

function buildWeeklyReport() {
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const closed = state.tasks.filter((task) => isIsoWithin(task.deliveredAt, weekStart, weekEnd)).length;
  const active = state.tasks.filter((task) => task.lane !== "done").length;
  const urgent = state.tasks.filter((task) => task.priority === "Alta" && task.lane !== "done").length;
  const blocked = state.tasks.filter((task) => task.approval === "Cambios" && task.lane !== "done").length;
  const sessions = Object.entries(state.timer.history || {}).reduce((sum, [dateKey, count]) => {
    const date = new Date(`${dateKey}T00:00:00`);
    return date >= weekStart && date <= weekEnd ? sum + count : sum;
  }, 0);

  return {
    kicker: "Cierre semanal",
    title: "Esta semana hiciste que muchas cosas tomaran forma.",
    message: "Has logrado mucho esta semana. Estoy orgulloso de ti.",
    items: [
      { value: closed, label: "tareas cerradas" },
      { value: active, label: "pendientes activos" },
      { value: urgent, label: "urgentes abiertos" },
      { value: blocked, label: "con cambios por resolver" },
      { value: sessions, label: "sesiones de enfoque" }
    ]
  };
}

function dateKeyFromIso(value) {
  return value ? formatDateKey(new Date(value)) : "";
}

function isIsoWithin(value, start, end) {
  if (!value) return false;
  const date = new Date(value);
  return date >= start && date <= end;
}

function startOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

function getWeekKey(date) {
  return formatDateKey(startOfWeek(date));
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
