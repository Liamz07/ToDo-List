const PRIORITIES = new Set(["high", "medium", "low"]);

function createId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normaliseTitle(title) {
    const value = String(title ?? "").trim();

    if (!value) {
        throw new Error("Task name cannot be empty.");
    }

    return value;
}

function normalisePriority(priority) {
    const value = String(priority ?? "medium").toLowerCase();
    return PRIORITIES.has(value) ? value : "medium";
}

function normaliseDueDate(dueDate) {
    const value = String(dueDate ?? "").trim();

    if (!value) {
        return "";
    }

    const isDateTimeInputValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
    if (!isDateTimeInputValue) {
        throw new Error("Due date and time are invalid.");
    }

    const parsedDate = new Date(value);
    const [datePart, timePart] = value.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    if (
        Number.isNaN(parsedDate.getTime())
        || parsedDate.getFullYear() !== year
        || parsedDate.getMonth() !== month - 1
        || parsedDate.getDate() !== day
        || parsedDate.getHours() !== hours
        || parsedDate.getMinutes() !== minutes
    ) {
        throw new Error("Due date and time are invalid.");
    }

    if (parsedDate.getTime() <= Date.now()) {
        throw new Error("Due date and time must be in the future.");
    }

    return value;
}

export function addTask(tasks, taskData) {
    const now = new Date().toISOString();
    const task = {
        id: createId(),
        title: normaliseTitle(taskData.title),
        priority: normalisePriority(taskData.priority),
        dueDate: normaliseDueDate(taskData.dueDate),
        completed: false,
        expired: false,
        createdAt: now,
        updatedAt: now
    };

    return [...tasks, task];
}

export function editTask(tasks, id, changes) {
    return tasks.map((task) => {
        if (task.id !== id) {
            return task;
        }

        return {
            ...task,
            title: normaliseTitle(changes.title),
            priority: normalisePriority(changes.priority),
            dueDate: normaliseDueDate(changes.dueDate),
            expired: false,
            updatedAt: new Date().toISOString()
        };
    });
}

export function toggleTask(tasks, id) {
    return tasks.map((task) => (
        task.id === id && !task.expired
            ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() }
            : task
    ));
}

export function deleteTask(tasks, id) {
    return tasks.filter((task) => task.id !== id);
}

export function getTaskById(tasks, id) {
    return tasks.find((task) => task.id === id);
}

export function getExpiredTasks(tasks, now = new Date()) {
    return tasks.filter((task) => {
        if (!task.dueDate || task.completed || task.expired) {
            return false;
        }

        const dueTime = new Date(task.dueDate).getTime();
        return !Number.isNaN(dueTime) && dueTime <= now.getTime();
    });
}

export function markExpiredTasks(tasks, now = new Date()) {
    const expiredIds = new Set(getExpiredTasks(tasks, now).map((task) => task.id));

    return tasks.map((task) => (
        expiredIds.has(task.id)
            ? { ...task, expired: true, expiredAt: now.toISOString(), updatedAt: now.toISOString() }
            : task
    ));
}

export function getStatistics(tasks) {
    const completed = tasks.filter((task) => task.completed).length;
    const expired = tasks.filter((task) => task.expired).length;

    return {
        total: tasks.length,
        active: tasks.length - completed - expired,
        completed,
        expired
    };
}
