// Khai báo khóa (Key) dùng để lưu và lấy danh sách công việc trong LocalStorage
export const STORAGE_KEY = "todo-list-tasks";

// Khai báo khóa (Key) dùng để lưu và lấy giao diện (Theme Sáng/Tối) trong LocalStorage
export const THEME_STORAGE_KEY = "todo-list-theme";

/**
 * Chuẩn hóa và kiểm tra tính hợp lệ của dữ liệu công việc đọc từ LocalStorage
 * @param {Object} task - Đối tượng công việc thô đọc từ bộ nhớ
 * @returns {Object|null} Đối tượng đã làm sạch hoặc null nếu dữ liệu không hợp lệ
 */
function normaliseStoredTask(task) {
    // Kiểm tra cấu trúc cơ bản: Phải là Object, có ID và có tiêu đề dạng Chuỗi
    if (!task || typeof task !== "object" || !task.id || typeof task.title !== "string") {
        return null;
    }

    // Xóa khoảng trắng thừa hai đầu tiêu đề
    const title = task.title.trim();
    // Nếu tiêu đề sau khi làm sạch bị rỗng thì bỏ qua
    if (!title) {
        return null;
    }

    // Đảm bảo dữ liệu trả về đúng kiểu cấu trúc chuẩn
    return {
        id: String(task.id), // Ép kiểu ID về chuỗi
        title, // Tiêu đề đã làm sạch
        // Độ ưu tiên phải nằm trong danh sách cho phép, nếu sai gán về "medium"
        priority: ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium",
        // Kiểm tra đúng kiểu chuỗi cho các thuộc tính thời gian, nếu không hợp lệ thì gán chuỗi rỗng
        dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
        completed: Boolean(task.completed), // Ép kiểu về Boolean (true/false)
        expired: Boolean(task.expired), // Ép kiểu về Boolean (true/false)
        expiredAt: typeof task.expiredAt === "string" ? task.expiredAt : "",
        createdAt: typeof task.createdAt === "string" ? task.createdAt : "",
        updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : ""
    };
}

/**
 * Tải danh sách công việc từ LocalStorage
 * @returns {Array} Mảng chứa danh sách các công việc
 */
export function loadTasks() {
    try {
        // Lấy chuỗi JSON từ LocalStorage theo khóa STORAGE_KEY
        const savedTasks = localStorage.getItem(STORAGE_KEY);

        // Nếu chưa từng lưu dữ liệu thì trả về mảng rỗng
        if (!savedTasks) {
            return [];
        }

        // Chuyển chuỗi JSON thành mảng/đối tượng trong JS
        const parsedTasks = JSON.parse(savedTasks);
        
        // Kiểm tra nếu dữ liệu giải mã không phải là Mảng thì trả về mảng rỗng
        if (!Array.isArray(parsedTasks)) {
            return [];
        }

        // Chuẩn hóa từng task và lọc bỏ các giá trị null/không hợp lệ
        return parsedTasks.map(normaliseStoredTask).filter(Boolean);
    } catch (error) {
        // Bẫy lỗi khi JSON bị hỏng hoặc LocalStorage bị chặn
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

/**
 * Lưu danh sách công việc vào LocalStorage
 * @param {Array} tasks - Danh sách công việc cần lưu
 * @returns {boolean} Trạng thái lưu thành công (true/false)
 */
export function saveTasks(tasks) {
    try {
        // Chuyển mảng công việc thành chuỗi JSON và lưu vào LocalStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        // Bẫy lỗi nếu bộ nhớ LocalStorage đầy hoặc bị vô hiệu hóa
        console.error("Could not save tasks:", error);
        return false;
    }
}

/**
 * Tải cấu hình giao diện (Theme) từ LocalStorage
 * @returns {string} Chuỗi chỉ định theme ("light" hoặc "dark")
 */
export function loadTheme() {
    try {
        // Lấy giá trị theme đã lưu
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        // Nếu là "light" thì trả về "light", ngược lại mặc định là "dark"
        return savedTheme === "light" ? "light" : "dark";
    } catch (error) {
        // Bẫy lỗi nếu có sự cố xảy ra
        console.error("Could not load saved theme:", error);
        return "dark";
    }
}

/**
 * Lưu cấu hình giao diện (Theme) vào LocalStorage
 * @param {string} theme - Tên giao diện ("light" hoặc "dark")
 */
export function saveTheme(theme) {
    try {
        // Ghi giá trị theme vào LocalStorage
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        // Bẫy lỗi nếu có sự cố xảy ra
        console.error("Could not save theme:", error);
    }
}