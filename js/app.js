const STORAGE_KEY = "cloudtasks:tasks";

const form = document.getElementById("task-form");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const deadlineInput = document.getElementById("deadline");
const priorityInput = document.getElementById("priority");
const taskList = document.getElementById("task-list");

function getTasks() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
  const tasks = getTasks();
  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.textContent = `${task.title} (${task.priority})`;
    taskList.appendChild(li);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const task = {
    id: crypto.randomUUID(),
    title: titleInput.value,
    description: descriptionInput.value,
    completed: false,
    created_at: new Date().toISOString(),
    deadline: deadlineInput.value,
    priority: priorityInput.value,
  };

  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);

  form.reset();
  renderTasks();
});

renderTasks();
