// =========================================================
// CloudTasks - app.js
// Maneja: autenticación (Supabase Auth), equipos y tareas
// personales / de equipo, según el modelo ER del proyecto.
// =========================================================

const SUPABASE_URL = "https://agpyxjslkvggabibexvc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o3g3qTZbeTOKnoAcVHqigA_HwSJ2GOu";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Referencias DOM ----------
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginMessage = document.getElementById("login-message");
const registerMessage = document.getElementById("register-message");
const authTabs = document.querySelectorAll(".auth-tab");

const userDisplay = document.getElementById("user-display");
const logoutBtn = document.getElementById("logout-btn");

const viewTabs = document.querySelectorAll(".view-tab");
const teamsPanel = document.getElementById("teams-panel");
const teamSelect = document.getElementById("team-select");
const newTeamBtn = document.getElementById("new-team-btn");
const newTeamForm = document.getElementById("new-team-form");
const newTeamNameInput = document.getElementById("new-team-name");
const cancelTeamBtn = document.getElementById("cancel-team-btn");
const inviteForm = document.getElementById("invite-form");
const inviteEmailInput = document.getElementById("invite-email");
const teamMessage = document.getElementById("team-message");

const taskForm = document.getElementById("task-form");
const nameInput = document.getElementById("name");
const descriptionInput = document.getElementById("description");
const plannedDateInput = document.getElementById("planned-date");
const dueDateInput = document.getElementById("due-date");
const priorityInput = document.getElementById("priority");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");

// ---------- Estado local ----------
let currentUser = null;
let currentView = "personal"; // "personal" | "equipo"
let myTeams = [];
let currentTeamId = null;

// =========================================================
// AUTENTICACIÓN
// =========================================================

function setMessage(el, text, type) {
  el.textContent = text || "";
  el.classList.remove("error", "success");
  if (type) el.classList.add(type);
}

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    authTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    loginForm.classList.toggle("hidden", target !== "login");
    registerForm.classList.toggle("hidden", target !== "register");
  });
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(registerMessage, "", null);

  const username = document.getElementById("register-username").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    setMessage(registerMessage, error.message, "error");
    return;
  }

  setMessage(
    registerMessage,
    "Cuenta creada. Revisa tu correo para confirmar el registro e inicia sesión.",
    "success"
  );
  registerForm.reset();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(loginMessage, "", null);

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setMessage(loginMessage, "Credenciales inválidas o cuenta no confirmada.", "error");
    return;
  }
  loginForm.reset();
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    currentUser = session.user;
    showApp();
  } else {
    currentUser = null;
    showAuth();
  }
});

function showAuth() {
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
}

async function showApp() {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("username, email")
    .eq("id", currentUser.id)
    .single();

  userDisplay.textContent = profile ? `👤 ${profile.username}` : currentUser.email;

  await loadTeams();
  await renderTasks();
}

// =========================================================
// EQUIPOS
// =========================================================

async function loadTeams() {
  const { data: memberships, error } = await supabaseClient
    .from("team_members")
    .select("team_id, teams(id, name)")
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Error al cargar equipos:", error);
    myTeams = [];
  } else {
    myTeams = (memberships || [])
      .map((m) => m.teams)
      .filter(Boolean);
  }

  teamSelect.innerHTML = "";
  if (myTeams.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No perteneces a ningún equipo todavía";
    opt.value = "";
    teamSelect.appendChild(opt);
    currentTeamId = null;
  } else {
    myTeams.forEach((team) => {
      const opt = document.createElement("option");
      opt.value = team.id;
      opt.textContent = team.name;
      teamSelect.appendChild(opt);
    });
    currentTeamId = teamSelect.value || myTeams[0].id;
  }
  inviteForm.classList.toggle("hidden", !currentTeamId);
}

teamSelect.addEventListener("change", async () => {
  currentTeamId = teamSelect.value || null;
  inviteForm.classList.toggle("hidden", !currentTeamId);
  await renderTasks();
});

newTeamBtn.addEventListener("click", () => {
  newTeamForm.classList.remove("hidden");
});

cancelTeamBtn.addEventListener("click", () => {
  newTeamForm.classList.add("hidden");
  newTeamForm.reset();
});

newTeamForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = newTeamNameInput.value.trim();
  if (!name) return;

  const { data: team, error } = await supabaseClient
    .from("teams")
    .insert([{ name, owner_id: currentUser.id }])
    .select()
    .single();

  if (error) {
    setMessage(teamMessage, "No se pudo crear el equipo: " + error.message, "error");
    return;
  }

  // El creador también queda como miembro del equipo
  await supabaseClient.from("team_members").insert([
    { team_id: team.id, user_id: currentUser.id },
  ]);

  setMessage(teamMessage, `Equipo "${team.name}" creado.`, "success");
  newTeamForm.reset();
  newTeamForm.classList.add("hidden");
  await loadTeams();
});

inviteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(teamMessage, "", null);

  const email = inviteEmailInput.value.trim();
  if (!currentTeamId || !email) return;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, username")
    .eq("email", email)
    .maybeSingle();

  if (profileError || !profile) {
    setMessage(teamMessage, "No se encontró un usuario registrado con ese correo.", "error");
    return;
  }

  const { error } = await supabaseClient
    .from("team_members")
    .insert([{ team_id: currentTeamId, user_id: profile.id }]);

  if (error) {
    setMessage(teamMessage, "No se pudo agregar al integrante: " + error.message, "error");
    return;
  }

  setMessage(teamMessage, `${profile.username} fue agregado al equipo.`, "success");
  inviteForm.reset();
});

// =========================================================
// VISTAS (Mis tareas / Tareas de equipo)
// =========================================================

viewTabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    viewTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentView = tab.dataset.view;
    teamsPanel.classList.toggle("hidden", currentView !== "equipo");
    await renderTasks();
  });
});

// =========================================================
// TAREAS
// =========================================================

async function getTasks() {
  let query = supabaseClient.from("tasks").select("*").order("created_at", { ascending: false });

  if (currentView === "personal") {
    query = query.eq("task_type", "personal").eq("owner_id", currentUser.id);
  } else {
    if (!currentTeamId) return [];
    query = query.eq("task_type", "equipo").eq("team_id", currentTeamId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error al obtener tareas:", error);
    return [];
  }
  return data;
}

async function createTask(task) {
  const { error } = await supabaseClient.from("tasks").insert([task]);
  if (error) console.error("Error al crear tarea:", error);
  return !error;
}

async function toggleTaskCompleted(id, completed) {
  await supabaseClient.from("tasks").update({ completed }).eq("id", id);
  await renderTasks();
}

async function deleteTask(id) {
  await supabaseClient.from("tasks").delete().eq("id", id);
  await renderTasks();
}

function formatDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function buildTaskCard(task) {
  const li = document.createElement("li");
  li.className = `task-card priority-${task.priority}${task.completed ? " completed" : ""}`;

  const top = document.createElement("div");
  top.className = "task-top";

  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.name;
  titleWrap.appendChild(title);

  if (task.description) {
    const desc = document.createElement("div");
    desc.className = "task-desc";
    desc.textContent = task.description;
    titleWrap.appendChild(desc);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const doneBtn = document.createElement("button");
  doneBtn.title = task.completed ? "Marcar como pendiente" : "Marcar como completada";
  doneBtn.textContent = task.completed ? "↺" : "✔";
  doneBtn.addEventListener("click", () => toggleTaskCompleted(task.id, !task.completed));

  const delBtn = document.createElement("button");
  delBtn.title = "Eliminar tarea";
  delBtn.textContent = "🗑";
  delBtn.addEventListener("click", () => {
    if (confirm("¿Eliminar esta tarea?")) deleteTask(task.id);
  });

  actions.appendChild(doneBtn);
  actions.appendChild(delBtn);

  top.appendChild(titleWrap);
  top.appendChild(actions);

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priorityTag = document.createElement("span");
  priorityTag.className = "tag";
  priorityTag.textContent = `Prioridad: ${task.priority}`;
  meta.appendChild(priorityTag);

  if (task.planned_date) {
    const t = document.createElement("span");
    t.className = "tag";
    t.textContent = `Planeada: ${formatDate(task.planned_date)}`;
    meta.appendChild(t);
  }

  if (task.due_date) {
    const t = document.createElement("span");
    t.className = "tag";
    t.textContent = `Límite: ${formatDate(task.due_date)}`;
    meta.appendChild(t);
  }

  li.appendChild(top);
  li.appendChild(meta);
  return li;
}

async function renderTasks() {
  const tasks = await getTasks();
  taskList.innerHTML = "";
  emptyState.classList.toggle("hidden", tasks.length > 0);
  tasks.forEach((task) => taskList.appendChild(buildTaskCard(task)));
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (currentView === "equipo" && !currentTeamId) {
    alert("Selecciona o crea un equipo antes de agregar una tarea de equipo.");
    return;
  }

  const ok = await createTask({
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim() || null,
    planned_date: plannedDateInput.value || null,
    due_date: dueDateInput.value || null,
    priority: priorityInput.value,
    task_type: currentView,
    owner_id: currentUser.id,
    team_id: currentView === "equipo" ? currentTeamId : null,
  });

  if (ok) {
    taskForm.reset();
    priorityInput.value = "media";
    await renderTasks();
  }
});
