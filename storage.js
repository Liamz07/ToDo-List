export const STORAGE_KEY = "todo-list-tasks";
export const THEME_STORAGE_KEY = "todo-list-theme";

function normaliseStoredTask(task) {
    if (!task || typeof task !== "object" || !task.id || typeof task.title !== "string") {
        return null;
    }

    const title = task.title.trim();
    if (!title) {
        return null;
    }

    return {
        id: String(task.id),
        title,
        priority: ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium",
        dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
        completed: Boolean(task.completed),
        expired: Boolean(task.expired),
        expiredAt: typeof task.expiredAt === "string" ? task.expiredAt : "",
        createdAt: typeof task.createdAt === "string" ? task.createdAt : "",
        updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : ""
    };
}

export function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);

        if (!savedTasks) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);
        if (!Array.isArray(parsedTasks)) {
            return [];
        }

        return parsedTasks.map(normaliseStoredTask).filter(Boolean);
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

export function saveTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);
        return false;
    }
}

export function loadTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        return savedTheme === "light" ? "light" : "dark";
    } catch (error) {
        console.error("Could not load saved theme:", error);
        return "dark";
    }
}

export function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        console.error("Could not save theme:", error);
    }
}
