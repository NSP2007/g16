const SUPABASE_URL = "https://agpyxjslkvggabibexvc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o3g3qTZbeTOKnoAcVHqigA_HwSJ2GOu";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("task-form");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const deadlineInput = document.getElementById("deadline");
const priorityInput = document.getElementById("priority");
const taskList = document.getElementById("task-list");

async function getTasks() {
  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener tareas:", error);
    return [];
  }
  return data;
}

async function createTask(task) {
  const { error } = await supabaseClient.from("tasks").insert([task]);
  if (error) console.error("Error al crear tarea:", error);
}

async function renderTasks() {
  const tasks = await getTasks();
  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.textContent = `${task.title} (${task.priority})`;
    taskList.appendChild(li);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  await createTask({
    title: titleInput.value,
    description: descriptionInput.value,
    deadline: deadlineInput.value || null,
    priority: priorityInput.value,
  });

  form.reset();
  renderTasks();
});

renderTasks();
