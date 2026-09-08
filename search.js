export function searchTasks(tasks, searchTerm) {
    const term = String(searchTerm ?? "").trim().toLocaleLowerCase();

    if (!term) {
        return tasks;
    }

    return tasks.filter((task) => task.title.toLocaleLowerCase().includes(term));
}
