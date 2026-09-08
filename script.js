import {
    addTask,
    deleteTask,
    editTask,
    getExpiredTasks,
    getStatistics,
    getTaskById,
    markExpiredTasks,
    toggleTask
} from "./task.js";
import { searchTasks } from "./search.js";
import { filterTasks, sortTasks } from "./filter.js";
import {
    loadTasks,
    loadTheme,
    saveTasks,
    saveTheme,
    STORAGE_KEY,
    THEME_STORAGE_KEY
} from "./storage.js";

const form = document.querySelector("#task-form");
const taskInput = document.querySelector("#task");
const priorityInput = document.querySelector("#priority");
const dueDateInput = document.querySelector("#due-date");
const addButton = document.querySelector("#addtask");
const cancelEditButton = document.querySelector("#cancel-edit");
const searchInput = document.querySelector("#search");
const filterInput = document.querySelector("#filter");
const sortInput = document.querySelector("#sort");
const taskList = document.querySelector("#task-list");
const resultCount = document.querySelector(".result-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const totalCount = document.querySelector("#total-count");
const activeCount = document.querySelector("#active-count");
const completedCount = document.querySelector("#completed-count");
const expiredCount = document.querySelector("#expired-count");
const appNotification = document.querySelector("#app-notification");
const formMessage = document.querySelector("#form-message");
const themeToggle = document.querySelector("#theme-toggle");

let tasks = loadTasks();
let editingTaskId = null;
let notificationTimeoutId;
let expiryTimeoutId;

function persistTasks() {
    saveTasks(tasks);
    scheduleExpiryCheck();
}

function showNotification(message, tone = "info") {
    appNotification.textContent = message;
    appNotification.className = `app-notification app-notification--${tone}`;
    appNotification.hidden = false;

    window.clearTimeout(notificationTimeoutId);
    notificationTimeoutId = window.setTimeout(() => {
        appNotification.hidden = true;
    }, 6000);
}

function showFormMessage(message, tone = "info") {
    formMessage.textContent = message;
    formMessage.className = `form-message form-message--${tone}`;
    formMessage.hidden = false;
}

function clearFormMessage() {
    formMessage.hidden = true;
    formMessage.textContent = "";
}

function applyTheme(theme, shouldSave = false) {
    const isLightTheme = theme === "light";
    document.body.classList.toggle("light-theme", isLightTheme);
    themeToggle.textContent = isLightTheme ? "☾ Dark mode" : "☀ Light mode";
    themeToggle.setAttribute("aria-pressed", String(isLightTheme));

    if (shouldSave) {
        saveTheme(isLightTheme ? "light" : "dark");
    }
}

function notifyExpiredTasks(expiredTasks) {
    const taskWord = expiredTasks.length === 1 ? "task" : "tasks";
    const verb = expiredTasks.length === 1 ? "was" : "were";
    const titles = expiredTasks.slice(0, 2).map((task) => `“${task.title}”`).join(", ");
    const moreTasks = expiredTasks.length > 2 ? ` and ${expiredTasks.length - 2} more` : "";
    const message = `${expiredTasks.length} expired ${taskWord} ${verb} marked as expired: ${titles}${moreTasks}. Update the due date to reschedule.`;

    showNotification(message, "warning");

    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification("To-Do List", { body: message });
        } catch (error) {
            console.warn("Could not show browser notification:", error);
        }
    }
}

function expireDueTasks() {
    const expiredTasks = getExpiredTasks(tasks);
    if (!expiredTasks.length) {
        return;
    }

    tasks = markExpiredTasks(tasks);

    persistTasks();
    render();
    notifyExpiredTasks(expiredTasks);
}

function scheduleExpiryCheck() {
    window.clearTimeout(expiryTimeoutId);

    const nextExpiry = tasks
        .filter((task) => task.dueDate && !task.completed && !task.expired)
        .map((task) => new Date(task.dueDate).getTime())
        .filter((dueTime) => !Number.isNaN(dueTime) && dueTime > Date.now())
        .sort((first, second) => first - second)[0];

    if (!nextExpiry) {
        return;
    }

    const delay = Math.max(nextExpiry - Date.now() + 50, 50);
    expiryTimeoutId = window.setTimeout(expireDueTasks, delay);
}

function formatDueDate(task) {
    if (!task.dueDate) {
        return "No due date";
    }

    const date = new Date(task.dueDate);
    if (Number.isNaN(date.getTime())) {
        return "No due date";
    }

    const formattedDate = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date);

    if (task.expired) {
        return `Expired: ${formattedDate}`;
    }

    const now = new Date();
    const isDueToday = date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();

    return isDueToday ? `Due today: ${formattedDate}` : `Due: ${formattedDate}`;
}

function getMinimumDueDate() {
    const minimum = new Date();
    minimum.setSeconds(0, 0);
    minimum.setMinutes(minimum.getMinutes() + 1);

    const pad = (number) => String(number).padStart(2, "0");
    return `${minimum.getFullYear()}-${pad(minimum.getMonth() + 1)}-${pad(minimum.getDate())}`
        + `T${pad(minimum.getHours())}:${pad(minimum.getMinutes())}`;
}

function setMinimumDueDate() {
    dueDateInput.min = getMinimumDueDate();
}

function createTaskElement(task) {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " is-completed" : ""}${task.expired ? " is-expired" : ""}`;
    item.dataset.taskId = task.id;

    const taskMain = document.createElement("div");
    taskMain.className = "task-main";

    const completionLabel = document.createElement("label");
    completionLabel.className = "task-completion";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.disabled = task.expired;
    checkbox.dataset.action = "toggle";
    checkbox.setAttribute("aria-label", task.expired
        ? `${task.title} is expired. Edit it to reschedule.`
        : `Mark ${task.title} as ${task.completed ? "active" : "completed"}`);

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    completionLabel.append(checkbox, title);

    const metadata = document.createElement("div");
    metadata.className = "task-metadata";

    const priority = document.createElement("span");
    priority.className = `priority priority-${task.priority}`;
    priority.textContent = `${task.priority[0].toUpperCase()}${task.priority.slice(1)}`;

    const dueDate = document.createElement("span");
    dueDate.className = `due-date${task.expired ? " due-date-expired" : ""}`;
    dueDate.textContent = formatDueDate(task);

    metadata.append(priority, dueDate);

    if (task.expired) {
        const expiryStatus = document.createElement("span");
        expiryStatus.className = "expiration-status";
        expiryStatus.textContent = "Expired";
        metadata.append(expiryStatus);
    }
    taskMain.append(completionLabel, metadata);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.textContent = task.expired ? "Reschedule" : "Edit";
    editButton.setAttribute("aria-label", `${task.expired ? "Reschedule" : "Edit"} ${task.title}`);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

    actions.append(editButton, deleteButton);
    item.append(taskMain, actions);

    return item;
}

function renderTaskList(visibleTasks) {
    taskList.replaceChildren();

    if (!visibleTasks.length) {
        const emptyState = document.createElement("li");
        emptyState.className = "empty-state";
        emptyState.textContent = tasks.length
            ? "No tasks match your search or filter."
            : "No tasks found. Add a task to get started.";
        taskList.append(emptyState);
        return;
    }

    visibleTasks.forEach((task) => taskList.append(createTaskElement(task)));
}

function renderStatistics() {
    const statistics = getStatistics(tasks);
    totalCount.textContent = statistics.total;
    activeCount.textContent = statistics.active;
    completedCount.textContent = statistics.completed;
    expiredCount.textContent = statistics.expired;
    clearCompletedButton.disabled = statistics.completed === 0;
}

function render() {
    const searchedTasks = searchTasks(tasks, searchInput.value);
    const filteredTasks = filterTasks(searchedTasks, filterInput.value);
    const visibleTasks = sortTasks(filteredTasks, sortInput.value);

    resultCount.textContent = `${visibleTasks.length} ${visibleTasks.length === 1 ? "result" : "results"}`;
    renderTaskList(visibleTasks);
    renderStatistics();
}

function resetForm() {
    form.reset();
    priorityInput.value = "medium";
    editingTaskId = null;
    addButton.textContent = "Add Task";
    cancelEditButton.hidden = true;
    clearFormMessage();
}

function beginEdit(task) {
    editingTaskId = task.id;
    taskInput.value = task.title;
    priorityInput.value = task.priority;
    dueDateInput.value = task.dueDate;
    addButton.textContent = "Save Changes";
    cancelEditButton.hidden = false;
    showFormMessage(`Editing “${task.title}”. Save when you are done.`, "info");
    taskInput.focus();
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    setMinimumDueDate();

    const taskData = {
        title: taskInput.value,
        priority: priorityInput.value,
        dueDate: dueDateInput.value
    };

    try {
        const isEditing = Boolean(editingTaskId);
        tasks = isEditing
            ? editTask(tasks, editingTaskId, taskData)
            : addTask(tasks, taskData);
        persistTasks();
        resetForm();
        render();
        const message = isEditing ? "Task updated successfully." : "Task added successfully.";
        showFormMessage(message, "success");
        showNotification(message, "success");
        taskInput.focus();
    } catch (error) {
        showFormMessage(error.message, "error");
        taskInput.focus();
    }
});

cancelEditButton.addEventListener("click", () => {
    resetForm();
    showFormMessage("Editing cancelled.", "info");
    taskInput.focus();
});

form.addEventListener("input", clearFormMessage);
form.addEventListener("invalid", (event) => {
    if (event.target === taskInput) {
        showFormMessage("Please enter a task name before saving.", "error");
    }
}, true);

taskList.addEventListener("change", (event) => {
    if (event.target.dataset.action !== "toggle") {
        return;
    }

    const taskItem = event.target.closest("[data-task-id]");
    tasks = toggleTask(tasks, taskItem.dataset.taskId);
    persistTasks();
    render();
});

clearCompletedButton.addEventListener("click", () => {
    const completedTasks = tasks.filter((task) => task.completed);
    if (!completedTasks.length) {
        return;
    }

    if (window.confirm(`Permanently remove ${completedTasks.length} completed task(s)?`)) {
        const completedIds = new Set(completedTasks.map((task) => task.id));
        tasks = tasks.filter((task) => !completedIds.has(task.id));
        persistTasks();
        render();
        showNotification("Completed tasks cleared.", "success");
    }
});

taskList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const taskItem = button.closest("[data-task-id]");
    const task = getTaskById(tasks, taskItem.dataset.taskId);
    if (!task) {
        return;
    }

    if (button.dataset.action === "edit") {
        beginEdit(task);
        return;
    }

    if (button.dataset.action === "delete" && window.confirm(`Delete “${task.title}”?`)) {
        tasks = deleteTask(tasks, task.id);
        if (editingTaskId === task.id) {
            resetForm();
        }
        persistTasks();
        render();
    }
});

searchInput.addEventListener("input", render);
filterInput.addEventListener("change", render);
sortInput.addEventListener("change", render);
dueDateInput.addEventListener("focus", setMinimumDueDate);
themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("light-theme") ? "dark" : "light";
    applyTheme(nextTheme, true);
    showNotification(`Switched to ${nextTheme} mode.`, "info");
});

window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
        tasks = loadTasks();
        expireDueTasks();
        scheduleExpiryCheck();
        render();
        return;
    }

    if (event.key === THEME_STORAGE_KEY) {
        applyTheme(loadTheme());
    }
});

resetForm();
applyTheme(loadTheme());
setMinimumDueDate();
expireDueTasks();
scheduleExpiryCheck();
render();
