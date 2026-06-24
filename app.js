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
  reports: { dailyShown: "", weeklyShown: "" },
  profile: { name: "", avatar: "", note: "" },
  roadGame: { code: "" },
  sharedCalendar: { code: "", customActivities: [] }
};

const storeKey = "atelier-marketing-dashboard-v2";
const themeKey = "atelier-marketing-theme";
const mascotKey = "atelier-marketing-mascot";
const pageKey = "yamerito-active-page";
const cloudTable = "dashboard_states";
const roadGamesTable = "road_games";
const roadSpottingsTable = "road_spottings";
const sharedCalendarsTable = "shared_calendars";
const sharedCalendarEventsTable = "shared_calendar_events";
const supabaseUrl = "https://ljwwbnjgdmczdhckcztf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqd3dibmpnZG1jemRoY2tjenRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDU3MTEsImV4cCI6MjA5NzEyMTcxMX0.PGz3a1mry1HOJsI1YY1vyoHclJdUfucZR6BNZay6Jqc";
let state = loadState();
let activeFilter = "Todas";
let activeView = "flow";
let draggedId = null;
let timerInterval = null;
let supabaseClient = null;
let currentUser = null;
let cloudReady = false;
let cloudSaveTimer = null;
let loadingCloudState = false;
let pendingProfileAvatar = null;
let roadGameData = null;
let roadSpottings = [];
let calendarData = null;
let calendarEvents = [];
let calendarWeekStart = getStartOfWeek(new Date());
let draggedActivity = null;

const laneWrap = document.querySelector("#lanes");
const template = document.querySelector("#taskTemplate");
const form = document.querySelector("#taskForm");
const chips = [...document.querySelectorAll(".filter-group .chip")];
const pageButtons = [...document.querySelectorAll("[data-page]")];
const pagePanels = [...document.querySelectorAll("[data-page-panel]")];
const pageJumpButtons = [...document.querySelectorAll("[data-page-jump]")];
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
const authForm = document.querySelector("#authForm");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const accountButton = document.querySelector("#accountButton");
const accountAvatar = document.querySelector("#accountAvatar");
const accountIcon = document.querySelector("#accountIcon");
const accountInitial = document.querySelector("#accountInitial");
const authModal = document.querySelector("#authModal");
const authGuest = document.querySelector("#authGuest");
const authProfile = document.querySelector("#authProfile");
const authTitle = document.querySelector("#authTitle");
const authUserEmail = document.querySelector("#authUserEmail");
const syncStatus = document.querySelector("#syncStatus");
const profileForm = document.querySelector("#profileForm");
const profileName = document.querySelector("#profileName");
const profileAvatarFile = document.querySelector("#profileAvatarFile");
const profileAvatarStatus = document.querySelector("#profileAvatarStatus");
const profileNote = document.querySelector("#profileNote");
const profileAvatarPreview = document.querySelector("#profileAvatarPreview");
const profileInitial = document.querySelector("#profileInitial");
const roadGameStatus = document.querySelector("#roadGameStatus");
const roadGameCode = document.querySelector("#roadGameCode");
const joinRoadCode = document.querySelector("#joinRoadCode");
const roadSpotForm = document.querySelector("#roadSpotForm");
const roadMeName = document.querySelector("#roadMeName");
const roadMeTotal = document.querySelector("#roadMeTotal");
const roadMeBochos = document.querySelector("#roadMeBochos");
const roadMeCombis = document.querySelector("#roadMeCombis");
const roadOtherName = document.querySelector("#roadOtherName");
const roadOtherTotal = document.querySelector("#roadOtherTotal");
const roadOtherBochos = document.querySelector("#roadOtherBochos");
const roadOtherCombis = document.querySelector("#roadOtherCombis");
const roadHistory = document.querySelector("#roadHistory");
const calendarStatus = document.querySelector("#calendarStatus");
const calendarCode = document.querySelector("#calendarCode");
const joinCalendarCode = document.querySelector("#joinCalendarCode");
const weekLabel = document.querySelector("#weekLabel");
const weekCalendarGrid = document.querySelector("#weekCalendarGrid");
const customActivityForm = document.querySelector("#customActivityForm");
const customActivityName = document.querySelector("#customActivityName");
const monthModal = document.querySelector("#monthModal");
const monthTitle = document.querySelector("#monthTitle");
const monthCalendarGrid = document.querySelector("#monthCalendarGrid");

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
    reports: { ...seed.reports, ...(savedState.reports || {}) },
    profile: { ...seed.profile, ...(savedState.profile || {}) },
    roadGame: { ...seed.roadGame, ...(savedState.roadGame || {}) },
    sharedCalendar: { ...seed.sharedCalendar, ...(savedState.sharedCalendar || {}) }
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
  queueCloudSave();
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
  themeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeChoice === theme);
  });
}

function setAppPage(page) {
  const target = pagePanels.some((panel) => panel.dataset.pagePanel === page) ? page : "dashboard";
  pageButtons.forEach((button) => {
    const active = button.dataset.page === target;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  pagePanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.pagePanel === target);
  });
  localStorage.setItem(pageKey, target);
}

function render() {
  renderBoard();
  renderIdeas();
  renderWater();
  renderTimer();
  renderStats();
  renderMascot();
  renderAccountButton();
  renderProfileFields();
  renderRoadGame();
  renderCalendar();
  saveState();
}

function setSyncStatus(message) {
  syncStatus.textContent = message;
}

function canUseCloud() {
  return supabaseClient && currentUser && cloudReady && !loadingCloudState;
}

function queueCloudSave() {
  if (!canUseCloud()) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(saveCloudState, 800);
}

async function saveCloudState() {
  if (!canUseCloud()) return;
  setSyncStatus("Guardando en nube...");
  const { error } = await supabaseClient
    .from(cloudTable)
    .upsert({
      user_id: currentUser.id,
      state,
      updated_at: new Date().toISOString()
    });

  setSyncStatus(error ? "No se pudo sincronizar" : "Sincronizado");
}

async function loadCloudState() {
  if (!supabaseClient || !currentUser) return;
  loadingCloudState = true;
  setSyncStatus("Cargando nube...");

  const { data, error } = await supabaseClient
    .from(cloudTable)
    .select("state")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    setSyncStatus("Revisa la tabla en Supabase");
    loadingCloudState = false;
    return;
  }

  if (data?.state) {
    state = normalizeState(data.state);
    localStorage.setItem(storeKey, JSON.stringify(state));
  }

  cloudReady = true;
  loadingCloudState = false;
  render();
  if (!data?.state) saveCloudState();
  loadRoadGame();
  loadSharedCalendar();
  setSyncStatus("Sincronizado");
}

async function initCloudSync() {
  if (!window.supabase || supabaseAnonKey.includes("REEMPLAZA")) {
    setSyncStatus("Guardado local");
    return;
  }

  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  renderAuthState();
  if (currentUser) loadCloudState();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    cloudReady = false;
    renderAuthState();
    if (currentUser) {
      loadCloudState();
    } else {
      setSyncStatus("Guardado local");
      roadGameData = null;
      roadSpottings = [];
      calendarData = null;
      calendarEvents = [];
      renderRoadGame();
      renderCalendar();
    }
  });
}

function renderAuthState() {
  const signedIn = Boolean(currentUser);
  authGuest.hidden = signedIn;
  authProfile.hidden = !signedIn;
  authUserEmail.textContent = currentUser?.email || "";
  authTitle.textContent = signedIn ? state.profile.name || "Tu perfil" : "Tu cuenta";
  setSyncStatus(signedIn ? "Conectando..." : "Guardado local");
  renderAccountButton();
  renderProfileFields(true);
}

function openAuthModal() {
  authModal.classList.add("is-open");
  authModal.setAttribute("aria-hidden", "false");
  renderAuthState();
}

function closeAuthModal() {
  authModal.classList.remove("is-open");
  authModal.setAttribute("aria-hidden", "true");
}

function getProfileInitial() {
  const source = state.profile.name || currentUser?.email || "";
  return source.trim().charAt(0).toUpperCase();
}

function renderAccountButton() {
  const avatar = state.profile.avatar?.trim();
  accountInitial.textContent = getProfileInitial();
  if (avatar) {
    accountAvatar.src = avatar;
    accountAvatar.hidden = false;
    accountIcon.hidden = true;
    accountInitial.hidden = true;
  } else if (currentUser) {
    accountAvatar.hidden = true;
    accountIcon.hidden = true;
    accountInitial.hidden = false;
    accountInitial.textContent = getProfileInitial();
  } else {
    accountAvatar.hidden = true;
    accountIcon.hidden = false;
    accountInitial.hidden = true;
  }
}

function renderProfileFields(force = false) {
  if (!force && profileForm.contains(document.activeElement)) return;
  if (currentUser) authTitle.textContent = state.profile.name || "Tu perfil";
  profileName.value = state.profile.name || "";
  profileNote.value = state.profile.note || "";
  profileInitial.textContent = getProfileInitial();
  profileAvatarStatus.textContent = state.profile.avatar ? "Foto cargada" : "JPG, PNG o WebP";

  const avatar = state.profile.avatar?.trim();
  if (avatar) {
    profileAvatarPreview.src = avatar;
    profileAvatarPreview.hidden = false;
    profileInitial.hidden = true;
  } else {
    profileAvatarPreview.hidden = true;
    profileInitial.hidden = false;
  }
}

function getPlayerName() {
  return state.profile.name || currentUser?.email?.split("@")[0] || "Yo";
}

function getRoadGameCode() {
  return (state.roadGame?.code || "").toUpperCase();
}

function renderRoadGame() {
  const code = getRoadGameCode();
  const signedIn = Boolean(currentUser);
  roadGameCode.textContent = code || "----";
  roadSpotForm.querySelector("button").disabled = !signedIn || !code;
  document.querySelector("#createRoadGame").disabled = !signedIn;
  document.querySelector("#joinRoadGame").disabled = !signedIn;

  if (!signedIn) {
    roadGameStatus.textContent = "Inicia sesión para competir";
  } else if (!code) {
    roadGameStatus.textContent = "Crea un código o únete a uno";
  } else if (!roadGameData) {
    roadGameStatus.textContent = "Reto listo para cargar";
  } else {
    roadGameStatus.textContent = roadGameData.joined_by ? "Reto conectado" : "Comparte el código";
  }

  const mine = roadSpottings.filter((spot) => spot.user_id === currentUser?.id);
  const other = roadSpottings.filter((spot) => spot.user_id !== currentUser?.id);
  renderRoadStats(mine, other);
  renderRoadHistory();
}

function renderRoadStats(mine, other) {
  roadMeName.textContent = getPlayerName();
  roadOtherName.textContent = getRoadOtherName();
  roadMeTotal.textContent = mine.length;
  roadMeBochos.textContent = countRoadType(mine, "bocho");
  roadMeCombis.textContent = countRoadType(mine, "combi");
  roadOtherTotal.textContent = other.length;
  roadOtherBochos.textContent = countRoadType(other, "bocho");
  roadOtherCombis.textContent = countRoadType(other, "combi");
}

function renderRoadHistory() {
  roadHistory.innerHTML = "";
  const recent = roadSpottings.slice(0, 8);
  if (!recent.length) {
    const empty = document.createElement("li");
    empty.innerHTML = "<span>Aún no hay avistamientos</span><span>Empieza el reto</span>";
    roadHistory.appendChild(empty);
    return;
  }

  recent.forEach((spot) => {
    const item = document.createElement("li");
    const owner = spot.user_id === currentUser?.id ? "Tú" : getRoadOtherName();
    const vehicle = spot.vehicle_type === "bocho" ? "Bocho" : "Combi";
    item.innerHTML = `<span>${owner}: ${vehicle} ${escapeHtml(spot.color)}</span><span>${formatRoadTime(spot.created_at)}</span>`;
    roadHistory.appendChild(item);
  });
}

function countRoadType(items, type) {
  return items.filter((item) => item.vehicle_type === type).length;
}

function getRoadOtherName() {
  if (!roadGameData) return "Otra persona";
  if (roadGameData.created_by === currentUser?.id) return roadGameData.joined_name || "Otra persona";
  return roadGameData.created_name || "Otra persona";
}

function formatRoadTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function createRoadCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function createRoadGame() {
  if (!canUseCloud()) {
    roadGameStatus.textContent = "Inicia sesión para crear un reto";
    return;
  }

  const code = createRoadCode();
  const { data, error } = await supabaseClient
    .from(roadGamesTable)
    .insert({
      code,
      created_by: currentUser.id,
      created_name: getPlayerName()
    })
    .select()
    .single();

  if (error) {
    roadGameStatus.textContent = "No se pudo crear el código";
    return;
  }

  state.roadGame.code = code;
  roadGameData = data;
  roadSpottings = [];
  joinRoadCode.value = "";
  render();
  saveCloudState();
}

async function joinRoadGame() {
  if (!canUseCloud()) {
    roadGameStatus.textContent = "Inicia sesión para unirte";
    return;
  }

  const code = joinRoadCode.value.trim().toUpperCase();
  if (!code) return;

  const { data: game, error: readError } = await supabaseClient
    .from(roadGamesTable)
    .select()
    .eq("code", code)
    .maybeSingle();

  if (readError || !game) {
    roadGameStatus.textContent = "Código no encontrado";
    return;
  }

  const update = game.created_by === currentUser.id
    ? { created_name: getPlayerName() }
    : { joined_by: currentUser.id, joined_name: getPlayerName() };

  const { data, error } = await supabaseClient
    .from(roadGamesTable)
    .update(update)
    .eq("code", code)
    .select()
    .single();

  if (error) {
    roadGameStatus.textContent = "No se pudo unir al reto";
    return;
  }

  state.roadGame.code = code;
  roadGameData = data;
  joinRoadCode.value = "";
  render();
  saveCloudState();
  loadRoadGame();
}

async function loadRoadGame() {
  const code = getRoadGameCode();
  if (!supabaseClient || !currentUser || !code) {
    renderRoadGame();
    return;
  }

  const { data: game, error: gameError } = await supabaseClient
    .from(roadGamesTable)
    .select()
    .eq("code", code)
    .maybeSingle();

  if (gameError || !game) {
    roadGameStatus.textContent = "No se pudo cargar el reto";
    return;
  }

  const { data: spots, error: spotsError } = await supabaseClient
    .from(roadSpottingsTable)
    .select()
    .eq("game_code", code)
    .order("created_at", { ascending: false });

  if (spotsError) {
    roadGameStatus.textContent = "No se pudo cargar el marcador";
    return;
  }

  roadGameData = game;
  roadSpottings = spots || [];
  renderRoadGame();
}

async function addRoadSpotting(event) {
  event.preventDefault();
  const code = getRoadGameCode();
  if (!canUseCloud() || !code) {
    roadGameStatus.textContent = "Primero crea o únete a un reto";
    return;
  }

  const formData = new FormData(roadSpotForm);
  const { error } = await supabaseClient
    .from(roadSpottingsTable)
    .insert({
      game_code: code,
      user_id: currentUser.id,
      vehicle_type: formData.get("type"),
      color: formData.get("color")
    });

  if (error) {
    roadGameStatus.textContent = "No se pudo agregar";
    return;
  }

  roadGameStatus.textContent = "Avistamiento agregado";
  showMascotMessage("Punto para el reto.");
  loadRoadGame();
}

function getCalendarCode() {
  return (state.sharedCalendar?.code || "").toUpperCase();
}

function renderCalendar() {
  const code = getCalendarCode();
  const signedIn = Boolean(currentUser);
  calendarCode.textContent = code || "----";
  calendarStatus.textContent = !signedIn
    ? "Inicia sesión para compartir"
    : !code
      ? "Crea un código o únete a uno"
      : calendarData?.joined_by
        ? "Calendario conectado"
        : "Comparte el código";
  document.querySelector("#createCalendar").disabled = !signedIn;
  document.querySelector("#joinCalendar").disabled = !signedIn;
  renderActivityPalette();
  renderWeekCalendar();
}

function renderActivityPalette() {
  document.querySelectorAll("[data-custom-activity]").forEach((item) => item.remove());
  const form = customActivityForm;
  (state.sharedCalendar.customActivities || []).forEach((activity) => {
    const button = document.createElement("button");
    button.type = "button";
    button.draggable = true;
    button.dataset.activity = activity;
    button.dataset.kind = "otro";
    button.dataset.customActivity = "true";
    button.textContent = activity;
    button.addEventListener("dragstart", onActivityDragStart);
    form.before(button);
  });
}

function renderWeekCalendar() {
  const days = getWeekDays(calendarWeekStart);
  weekLabel.textContent = `${formatShortDate(days[0])} - ${formatShortDate(days[6])}`;
  weekCalendarGrid.innerHTML = "";
  days.forEach((day) => {
    const dateKey = formatDateKey(day);
    const column = document.createElement("section");
    column.className = "calendar-day";
    column.dataset.date = dateKey;
    column.innerHTML = `
      <div class="calendar-day__head">
        <strong>${day.toLocaleDateString("es-MX", { weekday: "long" })}</strong>
        <span>${day.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
      </div>
      <div class="calendar-events"></div>
    `;
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("is-over");
    });
    column.addEventListener("dragleave", () => column.classList.remove("is-over"));
    column.addEventListener("drop", (event) => onCalendarDrop(event, dateKey, column));

    const list = column.querySelector(".calendar-events");
    calendarEvents
      .filter((item) => item.event_date === dateKey)
      .forEach((item) => list.appendChild(createCalendarEvent(item)));
    weekCalendarGrid.appendChild(column);
  });
}

function createCalendarEvent(event) {
  const item = document.createElement("article");
  item.className = "calendar-event";
  item.innerHTML = `<span>${escapeHtml(event.title)}</span>`;
  if (event.user_id === currentUser?.id) {
    const button = document.createElement("button");
    button.type = "button";
    button.title = "Quitar actividad";
    button.setAttribute("aria-label", "Quitar actividad");
    button.textContent = "×";
    button.addEventListener("click", () => deleteCalendarEvent(event.id));
    item.appendChild(button);
  }
  return item;
}

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function getStartOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function formatShortDate(date) {
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function onActivityDragStart(event) {
  draggedActivity = {
    title: event.currentTarget.dataset.activity,
    kind: event.currentTarget.dataset.kind
  };
}

async function onCalendarDrop(event, dateKey, column) {
  event.preventDefault();
  column.classList.remove("is-over");
  if (!draggedActivity) return;
  await addCalendarEvent(draggedActivity, dateKey);
  draggedActivity = null;
}

async function createSharedCalendar() {
  if (!canUseCloud()) {
    calendarStatus.textContent = "Inicia sesión para crear calendario";
    return;
  }
  const code = createRoadCode();
  const { data, error } = await supabaseClient
    .from(sharedCalendarsTable)
    .insert({ code, created_by: currentUser.id, created_name: getPlayerName() })
    .select()
    .single();
  if (error) {
    calendarStatus.textContent = "No se pudo crear";
    return;
  }
  state.sharedCalendar.code = code;
  calendarData = data;
  calendarEvents = [];
  render();
  saveCloudState();
}

async function joinSharedCalendar() {
  if (!canUseCloud()) {
    calendarStatus.textContent = "Inicia sesión para unirte";
    return;
  }
  const code = joinCalendarCode.value.trim().toUpperCase();
  if (!code) return;
  const { data: calendar, error: readError } = await supabaseClient
    .from(sharedCalendarsTable)
    .select()
    .eq("code", code)
    .maybeSingle();
  if (readError || !calendar) {
    calendarStatus.textContent = "Código no encontrado";
    return;
  }
  const update = calendar.created_by === currentUser.id
    ? { created_name: getPlayerName() }
    : { joined_by: currentUser.id, joined_name: getPlayerName() };
  const { data, error } = await supabaseClient
    .from(sharedCalendarsTable)
    .update(update)
    .eq("code", code)
    .select()
    .single();
  if (error) {
    calendarStatus.textContent = "No se pudo unir";
    return;
  }
  state.sharedCalendar.code = code;
  calendarData = data;
  joinCalendarCode.value = "";
  render();
  saveCloudState();
  loadSharedCalendar();
}

async function loadSharedCalendar() {
  const code = getCalendarCode();
  if (!supabaseClient || !currentUser || !code) {
    renderCalendar();
    return;
  }
  const { data: calendar, error: calendarError } = await supabaseClient
    .from(sharedCalendarsTable)
    .select()
    .eq("code", code)
    .maybeSingle();
  if (calendarError || !calendar) {
    calendarStatus.textContent = "No se pudo cargar";
    return;
  }
  const monthStart = new Date(calendarWeekStart);
  monthStart.setDate(1);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthStart.getMonth() + 2, 0);
  const { data: events, error: eventError } = await supabaseClient
    .from(sharedCalendarEventsTable)
    .select()
    .eq("calendar_code", code)
    .gte("event_date", formatDateKey(monthStart))
    .lte("event_date", formatDateKey(monthEnd))
    .order("event_date", { ascending: true });
  if (eventError) {
    calendarStatus.textContent = "No se pudieron cargar actividades";
    return;
  }
  calendarData = calendar;
  calendarEvents = events || [];
  renderCalendar();
}

async function addCalendarEvent(activity, dateKey) {
  const code = getCalendarCode();
  if (!canUseCloud() || !code) {
    calendarStatus.textContent = "Primero crea o únete a un calendario";
    return;
  }
  const { error } = await supabaseClient
    .from(sharedCalendarEventsTable)
    .insert({
      calendar_code: code,
      user_id: currentUser.id,
      title: activity.title,
      kind: activity.kind,
      event_date: dateKey
    });
  if (error) {
    calendarStatus.textContent = "No se pudo agregar";
    return;
  }
  calendarStatus.textContent = "Actividad agregada";
  loadSharedCalendar();
}

async function deleteCalendarEvent(id) {
  if (!supabaseClient || !currentUser) return;
  await supabaseClient.from(sharedCalendarEventsTable).delete().eq("id", id);
  loadSharedCalendar();
}

function renderMonthCalendar() {
  const monthDate = new Date(calendarWeekStart);
  monthTitle.textContent = monthDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = getStartOfWeek(first);
  monthCalendarGrid.innerHTML = "";
  Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const dateKey = formatDateKey(day);
    const cell = document.createElement("div");
    cell.className = `month-cell${day.getMonth() !== monthDate.getMonth() ? " is-muted" : ""}`;
    const dayEvents = calendarEvents.filter((item) => item.event_date === dateKey);
    cell.innerHTML = `<span>${day.getDate()}</span>${dayEvents.slice(0, 3).map((item) => `<b>${escapeHtml(item.title)}</b>`).join("")}`;
    monthCalendarGrid.appendChild(cell);
  });
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

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    setSyncStatus("Configura Supabase primero");
    return;
  }

  setSyncStatus("Entrando...");
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) setSyncStatus("No se pudo entrar");
});

document.querySelector("#signUp").addEventListener("click", async () => {
  if (!supabaseClient) {
    setSyncStatus("Configura Supabase primero");
    return;
  }

  setSyncStatus("Creando cuenta...");
  const { error } = await supabaseClient.auth.signUp({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  setSyncStatus(error ? "No se pudo crear" : "Cuenta creada. Revisa el correo.");
});

document.querySelector("#signOut").addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
});

accountButton.addEventListener("click", openAuthModal);

document.querySelector("#closeAuthModal").addEventListener("click", closeAuthModal);

authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuthModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && authModal.classList.contains("is-open")) closeAuthModal();
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.profile = {
    name: profileName.value.trim(),
    avatar: pendingProfileAvatar ?? state.profile.avatar,
    note: profileNote.value.trim()
  };
  pendingProfileAvatar = null;
  profileAvatarFile.value = "";
  render();
  renderProfileFields(true);
  setSyncStatus("Perfil guardado");
});

profileAvatarFile.addEventListener("change", async () => {
  const file = profileAvatarFile.files?.[0];
  if (!file) return;

  profileAvatarStatus.textContent = "Preparando foto...";
  try {
    pendingProfileAvatar = await resizeProfileImage(file);
    profileAvatarPreview.src = pendingProfileAvatar;
    profileAvatarPreview.hidden = false;
    profileInitial.hidden = true;
    profileAvatarStatus.textContent = "Lista para guardar";
  } catch {
    pendingProfileAvatar = null;
    profileAvatarFile.value = "";
    profileAvatarStatus.textContent = "No se pudo cargar la foto";
  }
});

document.querySelector("#removeProfileAvatar").addEventListener("click", () => {
  pendingProfileAvatar = "";
  profileAvatarFile.value = "";
  profileAvatarPreview.hidden = true;
  profileInitial.hidden = false;
  profileAvatarStatus.textContent = "Foto quitada. Guarda el perfil.";
});

document.querySelector("#createRoadGame").addEventListener("click", createRoadGame);
document.querySelector("#joinRoadGame").addEventListener("click", joinRoadGame);
document.querySelector("#refreshRoadGame").addEventListener("click", loadRoadGame);
roadSpotForm.addEventListener("submit", addRoadSpotting);

document.querySelector("#createCalendar").addEventListener("click", createSharedCalendar);
document.querySelector("#joinCalendar").addEventListener("click", joinSharedCalendar);
document.querySelector("#previousWeek").addEventListener("click", () => {
  calendarWeekStart.setDate(calendarWeekStart.getDate() - 7);
  loadSharedCalendar();
});
document.querySelector("#nextWeek").addEventListener("click", () => {
  calendarWeekStart.setDate(calendarWeekStart.getDate() + 7);
  loadSharedCalendar();
});
document.querySelector("#openMonthCalendar").addEventListener("click", () => {
  renderMonthCalendar();
  monthModal.classList.add("is-open");
  monthModal.setAttribute("aria-hidden", "false");
});
document.querySelector("#closeMonthCalendar").addEventListener("click", () => {
  monthModal.classList.remove("is-open");
  monthModal.setAttribute("aria-hidden", "true");
});
monthModal.addEventListener("click", (event) => {
  if (event.target === monthModal) {
    monthModal.classList.remove("is-open");
    monthModal.setAttribute("aria-hidden", "true");
  }
});
document.querySelectorAll("[data-activity]").forEach((button) => {
  button.addEventListener("dragstart", onActivityDragStart);
});
customActivityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = customActivityName.value.trim();
  if (!value) return;
  state.sharedCalendar.customActivities = [...new Set([...(state.sharedCalendar.customActivities || []), value])];
  customActivityName.value = "";
  render();
});

joinRoadCode.addEventListener("input", () => {
  joinRoadCode.value = joinRoadCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

joinCalendarCode.addEventListener("input", () => {
  joinCalendarCode.value = joinCalendarCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

function resizeProfileImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Archivo no valido"));
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("error", reject);
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", reject);
      image.addEventListener("load", () => {
        const size = 360;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const side = Math.min(image.width, image.height);
        const sourceX = (image.width - side) / 2;
        const sourceY = (image.height - side) / 2;
        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, sourceX, sourceY, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      });
      image.src = reader.result;
    });
    reader.readAsDataURL(file);
  });
}

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

pageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAppPage(button.dataset.page);
  });
});

pageJumpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAppPage(button.dataset.pageJump);
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
setAppPage(localStorage.getItem(pageKey) || "dashboard");
render();
initCloudSync();
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
