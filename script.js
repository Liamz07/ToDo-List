// ==========================================
// 1. NHẬP CÁC HÀM XỬ LÝ DỮ LIỆU VÀ TIỆN ÍCH
// ==========================================
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

// ==========================================
// 2. TRUY XUẤT CÁC PHẦN TỬ DOM (ELEMENTS)
// ==========================================
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

// ==========================================
// 3. KHỞI TẠO BIẾN TRẠNG THÁI (STATE)
// ==========================================
let tasks = loadTasks(); // Mảng chứa danh sách task tải từ bộ nhớ
let editingTaskId = null; // ID của task đang được chỉnh sửa (null nếu đang ở chế độ thêm mới)
let notificationTimeoutId; // ID bộ đếm thời gian cho thông báo ứng dụng
let expiryTimeoutId; // ID bộ đếm thời gian cho việc kiểm tra task hết hạn tự động

/**
 * Lưu danh sách task vào LocalStorage và lên lịch kiểm tra hết hạn
 */
function persistTasks() {
    saveTasks(tasks);
    scheduleExpiryCheck();
}

/**
 * Hiển thị thông báo chung toàn ứng dụng (Notification bar)
 * @param {string} message - Nội dung thông báo
 * @param {string} tone - Mức độ (info, success, warning, error)
 */
function showNotification(message, tone = "info") {
    appNotification.textContent = message;
    appNotification.className = `app-notification app-notification--${tone}`;
    appNotification.hidden = false;

    // Tự động ẩn thông báo sau 6 giây
    window.clearTimeout(notificationTimeoutId);
    notificationTimeoutId = window.setTimeout(() => {
        appNotification.hidden = true;
    }, 6000);
}

/**
 * Hiển thị thông điệp phản hồi ngay dưới Form
 */
function showFormMessage(message, tone = "info") {
    formMessage.textContent = message;
    formMessage.className = `form-message form-message--${tone}`;
    formMessage.hidden = false;
}

/**
 * Xóa/Ẩn thông điệp bên dưới Form
 */
function clearFormMessage() {
    formMessage.hidden = true;
    formMessage.textContent = "";
}

/**
 * Áp dụng giao diện Sáng/Tối (Light/Dark Theme)
 * @param {string} theme - Tên giao diện ("light" hoặc "dark")
 * @param {boolean} shouldSave - Có lưu lựa chọn vào LocalStorage hay không
 */
function applyTheme(theme, shouldSave = false) {
    const isLightTheme = theme === "light";
    // Thêm hoặc xóa class 'light-theme' ở thẻ <body>
    document.body.classList.toggle("light-theme", isLightTheme);
    themeToggle.textContent = isLightTheme ? "☾ Dark mode" : "☀ Light mode";
    themeToggle.setAttribute("aria-pressed", String(isLightTheme));

    if (shouldSave) {
        saveTheme(isLightTheme ? "light" : "dark");
    }
}

/**
 * Gửi thông báo khi có task bị hết hạn (hỗ trợ cả Web Notification API)
 * @param {Array} expiredTasks - Danh sách các task vừa bị hết hạn
 */
function notifyExpiredTasks(expiredTasks) {
    const taskWord = expiredTasks.length === 1 ? "task" : "tasks";
    const verb = expiredTasks.length === 1 ? "was" : "were";
    const titles = expiredTasks.slice(0, 2).map((task) => `“${task.title}”`).join(", ");
    const moreTasks = expiredTasks.length > 2 ? ` and ${expiredTasks.length - 2} more` : "";
    const message = `${expiredTasks.length} expired ${taskWord} ${verb} marked as expired: ${titles}${moreTasks}. Update the due date to reschedule.`;

    // Hiển thị thông báo trên UI
    showNotification(message, "warning");

    // Nếu trình duyệt cho phép, gửi Notification của Hệ điều hành/Trình duyệt
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification("To-Do List", { body: message });
        } catch (error) {
            console.warn("Could not show browser notification:", error);
        }
    }
}

/**
 * Xử lý đánh dấu các task đã quá hạn
 */
function expireDueTasks() {
    const expiredTasks = getExpiredTasks(tasks);
    if (!expiredTasks.length) {
        return;
    }

    // Cập nhật trạng thái expired cho các task quá hạn
    tasks = markExpiredTasks(tasks);

    persistTasks();
    render();
    notifyExpiredTasks(expiredTasks);
}

/**
 * Lên lịch hẹn giờ tự động kích hoạt hàm expireDueTasks khi tới thời điểm hết hạn của task gần nhất
 */
function scheduleExpiryCheck() {
    window.clearTimeout(expiryTimeoutId);

    // Tìm mốc thời gian hết hạn gần nhất trong tương lai của các task chưa hoàn thành
    const nextExpiry = tasks
        .filter((task) => task.dueDate && !task.completed && !task.expired)
        .map((task) => new Date(task.dueDate).getTime())
        .filter((dueTime) => !Number.isNaN(dueTime) && dueTime > Date.now())
        .sort((first, second) => first - second)[0];

    if (!nextExpiry) {
        return;
    }

    // Đặt bộ đếm thời gian cho mốc hết hạn tiếp theo (tối thiểu là 50ms)
    const delay = Math.max(nextExpiry - Date.now() + 50, 50);
    expiryTimeoutId = window.setTimeout(expireDueTasks, delay);
}

/**
 * Định dạng chuỗi thời gian hạn chót để hiển thị ra UI
 */
function formatDueDate(task) {
    if (!task.dueDate) {
        return "No due date";
    }

    const date = new Date(task.dueDate);
    if (Number.isNaN(date.getTime())) {
        return "No due date";
    }

    // Format ngày giờ theo chuẩn "en-GB" (DD/MM/YYYY, HH:mm)
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

/**
 * Lấy mốc thời gian tối thiểu có thể chọn cho ô Input Date (Phút tiếp theo tính từ hiện tại)
 */
function getMinimumDueDate() {
    const minimum = new Date();
    minimum.setSeconds(0, 0);
    minimum.setMinutes(minimum.getMinutes() + 1);

    const pad = (number) => String(number).padStart(2, "0");
    return `${minimum.getFullYear()}-${pad(minimum.getMonth() + 1)}-${pad(minimum.getDate())}`
        + `T${pad(minimum.getHours())}:${pad(minimum.getMinutes())}`;
}

/**
 * Đặt thuộc tính 'min' cho ô input datetime-local để ngăn người dùng chọn quá khứ
 */
function setMinimumDueDate() {
    dueDateInput.min = getMinimumDueDate();
}

/**
 * Tạo một phần tử HTML `<li>` đại diện cho một task
 * @param {Object} task - Đối tượng task
 * @returns {HTMLLIElement} Phần tử HTML của task
 */
function createTaskElement(task) {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " is-completed" : ""}${task.expired ? " is-expired" : ""}`;
    item.dataset.taskId = task.id;

    const taskMain = document.createElement("div");
    taskMain.className = "task-main";

    const completionLabel = document.createElement("label");
    completionLabel.className = "task-completion";

    // Ô checkbox hoàn thành
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.disabled = task.expired; // Vô hiệu hóa checkbox nếu task đã hết hạn
    checkbox.dataset.action = "toggle";
    checkbox.setAttribute("aria-label", task.expired
        ? `${task.title} is expired. Edit it to reschedule.`
        : `Mark ${task.title} as ${task.completed ? "active" : "completed"}`);

    // Tên task
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    completionLabel.append(checkbox, title);

    // Thông tin phụ (Metadata): Độ ưu tiên, hạn chót
    const metadata = document.createElement("div");
    metadata.className = "task-metadata";

    const priority = document.createElement("span");
    priority.className = `priority priority-${task.priority}`;
    priority.textContent = `${task.priority[0].toUpperCase()}${task.priority.slice(1)}`;

    const dueDate = document.createElement("span");
    dueDate.className = `due-date${task.expired ? " due-date-expired" : ""}`;
    dueDate.textContent = formatDueDate(task);

    metadata.append(priority, dueDate);

    // Thẻ trạng thái Hết hạn nếu có
    if (task.expired) {
        const expiryStatus = document.createElement("span");
        expiryStatus.className = "expiration-status";
        expiryStatus.textContent = "Expired";
        metadata.append(expiryStatus);
    }
    taskMain.append(completionLabel, metadata);

    // Các nút thao tác (Edit, Delete)
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

/**
 * Hiển thị danh sách task lên giao diện
 * @param {Array} visibleTasks - Danh sách các task cần hiển thị (đã qua lọc, tìm kiếm, sắp xếp)
 */
function renderTaskList(visibleTasks) {
    taskList.replaceChildren(); // Xóa sạch các phần tử cũ trong <ul>

    // Trường hợp danh sách rỗng
    if (!visibleTasks.length) {
        const emptyState = document.createElement("li");
        emptyState.className = "empty-state";
        emptyState.textContent = tasks.length
            ? "No tasks match your search or filter."
            : "No tasks found. Add a task to get started.";
        taskList.append(emptyState);
        return;
    }

    // Duyệt và thêm từng task vào <ul>
    visibleTasks.forEach((task) => taskList.append(createTaskElement(task)));
}

/**
 * Cập nhật số liệu thống kê lên UI
 */
function renderStatistics() {
    const statistics = getStatistics(tasks);
    totalCount.textContent = statistics.total;
    activeCount.textContent = statistics.active;
    completedCount.textContent = statistics.completed;
    expiredCount.textContent = statistics.expired;
    // Nút "Clear completed" chỉ sáng lên khi có ít nhất 1 task đã hoàn thành
    clearCompletedButton.disabled = statistics.completed === 0;
}

/**
 * Hàm Render chính: Phụ trách đồng bộ toàn bộ dữ liệu ra Giao diện người dùng
 */
function render() {
    // Áp dụng chuỗi các thao tác: Tìm kiếm -> Lọc -> Sắp xếp
    const searchedTasks = searchTasks(tasks, searchInput.value);
    const filteredTasks = filterTasks(searchedTasks, filterInput.value);
    const visibleTasks = sortTasks(filteredTasks, sortInput.value);

    // Cập nhật số lượng kết quả hiển thị
    resultCount.textContent = `${visibleTasks.length} ${visibleTasks.length === 1 ? "result" : "results"}`;
    renderTaskList(visibleTasks);
    renderStatistics();
}

/**
 * Đặt lại trạng thái Form về mặc định (Chế độ Thêm mới)
 */
function resetForm() {
    form.reset();
    priorityInput.value = "medium";
    editingTaskId = null;
    addButton.textContent = "Add Task";
    cancelEditButton.hidden = true;
    clearFormMessage();
}

/**
 * Chuyển Form sang chế độ Chỉnh sửa một task
 * @param {Object} task - Task cần sửa
 */
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

// ==========================================
// 4. ĐĂNG KÝ CÁC SỰ KIỆN (EVENT LISTENERS)
// ==========================================

// Bắt sự kiện Submit Form (Thêm mới hoặc Cập nhật)
form.addEventListener("submit", (event) => {
    event.preventDefault(); // Chặn hành vi load lại trang mặc định
    setMinimumDueDate();

    const taskData = {
        title: taskInput.value,
        priority: priorityInput.value,
        dueDate: dueDateInput.value
    };

    try {
        const isEditing = Boolean(editingTaskId);
        // Nếu đang sửa thì gọi editTask, ngược lại gọi addTask
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
        // Hiển thị lỗi nếu Validation dữ liệu thất bại
        showFormMessage(error.message, "error");
        taskInput.focus();
    }
});

// Sự kiện bấm nút Hủy chỉnh sửa
cancelEditButton.addEventListener("click", () => {
    resetForm();
    showFormMessage("Editing cancelled.", "info");
    taskInput.focus();
});

// Xóa thông điệp lỗi trên Form khi người dùng gõ phím
form.addEventListener("input", clearFormMessage);

// Xử lý thông báo tùy chỉnh khi input không hợp lệ (HTML5 validation)
form.addEventListener("invalid", (event) => {
    if (event.target === taskInput) {
        showFormMessage("Please enter a task name before saving.", "error");
    }
}, true);

// Bắt sự kiện thay đổi trạng thái Checkbox (Hoàn thành / Chưa hoàn thành) bằng Event Delegation
taskList.addEventListener("change", (event) => {
    if (event.target.dataset.action !== "toggle") {
        return;
    }

    const taskItem = event.target.closest("[data-task-id]");
    tasks = toggleTask(tasks, taskItem.dataset.taskId);
    persistTasks();
    render();
});

// Xử lý xóa tất cả các task đã hoàn thành
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

// Bắt sự kiện click các nút Edit/Delete trong danh sách task bằng Event Delegation
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

    // Hành động Chỉnh sửa
    if (button.dataset.action === "edit") {
        beginEdit(task);
        return;
    }

    // Hành động Xóa
    if (button.dataset.action === "delete" && window.confirm(`Delete “${task.title}”?`)) {
        tasks = deleteTask(tasks, task.id);
        // Nếu task đang sửa bị xóa thì reset form
        if (editingTaskId === task.id) {
            resetForm();
        }
        persistTasks();
        render();
    }
});

// Lắng nghe thay đổi tìm kiếm, lọc và sắp xếp
searchInput.addEventListener("input", render);
filterInput.addEventListener("change", render);
sortInput.addEventListener("change", render);
dueDateInput.addEventListener("focus", setMinimumDueDate);

// Lắng nghe sự kiện chuyển đổi Giao diện (Dark/Light mode)
themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("light-theme") ? "dark" : "light";
    applyTheme(nextTheme, true);
    showNotification(`Switched to ${nextTheme} mode.`, "info");
});

// Đồng bộ dữ liệu real-time giữa các Tab trình duyệt khác nhau
window.addEventListener("storage", (event) => {
    // Nếu dữ liệu task ở tab khác thay đổi
    if (event.key === STORAGE_KEY) {
        tasks = loadTasks();
        expireDueTasks();
        scheduleExpiryCheck();
        render();
        return;
    }

    // Nếu theme ở tab khác thay đổi
    if (event.key === THEME_STORAGE_KEY) {
        applyTheme(loadTheme());
    }
});

// ==========================================
// 5. KHỞI CHẠY ỨNG DỤNG (INITIALIZATION)
// ==========================================
resetForm();
applyTheme(loadTheme());
setMinimumDueDate();
expireDueTasks();
scheduleExpiryCheck();
render();