function isDueToday(dueDate, now) {
    if (!dueDate) {
        return false;
    }

    const due = new Date(dueDate);
    return !Number.isNaN(due.getTime())
        && due.getFullYear() === now.getFullYear()
        && due.getMonth() === now.getMonth()
        && due.getDate() === now.getDate();
}

export function filterTasks(tasks, filterValue, now = new Date()) {
    switch (String(filterValue ?? "all").toLowerCase()) {
        case "active":
            return tasks.filter((task) => !task.completed && !task.expired);
        case "completed":
            return tasks.filter((task) => task.completed);
        case "expired":
            return tasks.filter((task) => task.expired);
        case "high":
        case "medium":
        case "low":
            return tasks.filter((task) => task.priority === filterValue);
        case "due-today":
            return tasks.filter((task) => !task.completed && !task.expired && isDueToday(task.dueDate, now));
        case "no-due-date":
            return tasks.filter((task) => !task.dueDate);
        default:
            return tasks;
    }
}

export function sortTasks(tasks, sortValue) {
    const priorityWeight = { high: 0, medium: 1, low: 2 };
    const getDueTime = (task) => {
        const dueTime = new Date(task.dueDate).getTime();
        return Number.isNaN(dueTime) ? Number.POSITIVE_INFINITY : dueTime;
    };

    return [...tasks].sort((first, second) => {
        if (sortValue === "priority") {
            return priorityWeight[first.priority] - priorityWeight[second.priority]
                || getDueTime(first) - getDueTime(second);
        }

        if (sortValue === "newest") {
            return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
        }

        return getDueTime(first) - getDueTime(second);
    });
}
