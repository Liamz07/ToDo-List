// Khởi tạo một Set chứa danh sách các mức độ ưu tiên hợp lệ
const PRIORITIES = new Set(["high", "medium", "low"]);

/**
 * Tạo ID duy nhất (UUID) cho công việc mới
 */
function createId() {
    // Ưu tiên dùng crypto.randomUUID() của trình duyệt/NodeJS, nếu không có thì dùng fallback dựa trên thời gian và random
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Chuẩn hóa tên/tiêu đề của công việc
 */
function normaliseTitle(title) {
    // Chuyển giá trị về chuỗi (nếu null/undefined thì thành "") và loại bỏ khoảng trắng thừa 2 đầu
    const value = String(title ?? "").trim();

    // Nếu tiêu đề rỗng thì ném ra lỗi
    if (!value) {
        throw new Error("Task name cannot be empty.");
    }

    // Trả về tiêu đề hợp lệ đã được làm sạch
    return value;
}

/**
 * Chuẩn hóa mức độ ưu tiên
 */
function normalisePriority(priority) {
    // Chuyển giá trị về chuỗi chữ thường, mặc định là "medium" nếu null/undefined
    const value = String(priority ?? "medium").toLowerCase();
    
    // Kiểm tra xem mức ưu tiên có nằm trong PRIORITIES hợp lệ không, nếu có thì giữ nguyên, không thì gán về "medium"
    return PRIORITIES.has(value) ? value : "medium";
}

/**
 * Chuẩn hóa và kiểm tra tính hợp lệ của ngày hết hạn (Due Date)
 */
function normaliseDueDate(dueDate) {
    // Chuyển giá trị về chuỗi và loại bỏ khoảng trắng thừa
    const value = String(dueDate ?? "").trim();

    // Nếu không nhập ngày hết hạn thì trả về chuỗi rỗng
    if (!value) {
        return "";
    }

    // Kiểm tra xem định dạng đầu vào có đúng chuẩn HTML datetime-local (YYYY-MM-DDTHH:mm) hay không
    const isDateTimeInputValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
    if (!isDateTimeInputValue) {
        throw new Error("Due date and time are invalid.");
    }

    // Chuyển chuỗi thành đối tượng Date
    const parsedDate = new Date(value);
    
    // Tách phần ngày (datePart) và phần giờ (timePart) từ chuỗi "YYYY-MM-DDTHH:mm"
    const [datePart, timePart] = value.split("T");
    
    // Tách và ép kiểu năm, tháng, ngày về dạng số
    const [year, month, day] = datePart.split("-").map(Number);
    
    // Tách và ép kiểu giờ, phút về dạng số
    const [hours, minutes] = timePart.split(":").map(Number);

    // Kiểm tra xem ngày tháng nhập vào có thực sự tồn tại hay không (ví dụ tránh ngày 31/02 hoặc 25/13)
    if (
        Number.isNaN(parsedDate.getTime()) // Ngày không hợp lệ
        || parsedDate.getFullYear() !== year // Năm không khớp
        || parsedDate.getMonth() !== month - 1 // Tháng không khớp (tháng trong JS tính từ 0 - 11)
        || parsedDate.getDate() !== day // Ngày không khớp
        || parsedDate.getHours() !== hours // Giờ không khớp
        || parsedDate.getMinutes() !== minutes // Phút không khớp
    ) {
        throw new Error("Due date and time are invalid.");
    }

    // Kiểm tra nếu thời gian hạn chót nhỏ hơn hoặc bằng thời gian hiện tại
    if (parsedDate.getTime() <= Date.now()) {
        throw new Error("Due date and time must be in the future.");
    }

    // Trả về chuỗi hạn chót hợp lệ
    return value;
}

/**
 * Thêm một công việc mới vào danh sách
 */
export function addTask(tasks, taskData) {
    // Lấy thời gian hiện tại dưới dạng chuỗi ISO
    const now = new Date().toISOString();
    
    // Khởi tạo đối tượng công việc mới với các dữ liệu đã qua chuẩn hóa
    const task = {
        id: createId(), // Tạo ID
        title: normaliseTitle(taskData.title), // Chuẩn hóa tiêu đề
        priority: normalisePriority(taskData.priority), // Chuẩn hóa mức ưu tiên
        dueDate: normaliseDueDate(taskData.dueDate), // Chuẩn hóa hạn chót
        completed: false, // Trạng thái hoàn thành mặc định là chưa (false)
        expired: false, // Trạng thái quá hạn mặc định là chưa (false)
        createdAt: now, // Thời gian tạo
        updatedAt: now // Thời gian cập nhật gần nhất
    };

    // Trả về mảng mới bao gồm danh sách cũ cộng thêm công việc mới (bảo toàn tính immutability)
    return [...tasks, task];
}

/**
 * Cập nhật thông tin của một công việc theo ID
 */
export function editTask(tasks, id, changes) {
    // Duyệt qua mảng danh sách công việc
    return tasks.map((task) => {
        // Nếu không phải công việc cần sửa thì giữ nguyên
        if (task.id !== id) {
            return task;
        }

        // Nếu đúng công việc cần sửa, trả về đối tượng mới với các thông tin đã cập nhật
        return {
            ...task, // Cập nhật giữ lại các thông số cũ
            title: normaliseTitle(changes.title), // Cập nhật tiêu đề mới
            priority: normalisePriority(changes.priority), // Cập nhật mức ưu tiên mới
            dueDate: normaliseDueDate(changes.dueDate), // Cập nhật hạn chót mới
            expired: false, // Đặt lại trạng thái hết hạn về false
            updatedAt: new Date().toISOString() // Cập nhật mốc thời gian sửa
        };
    });
}

/**
 * Chuyển đổi trạng thái hoàn thành (Bật/Tắt) của một công việc
 */
export function toggleTask(tasks, id) {
    return tasks.map((task) => (
        // Nếu tìm đúng task theo ID và task đó chưa bị quá hạn
        task.id === id && !task.expired
            // Đảo ngược trạng thái completed và cập nhật lại mốc thời gian updatedAt
            ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() }
            // Nếu không thỏa điều kiện thì giữ nguyên task
            : task
    ));
}

/**
 * Xóa một công việc khỏi danh sách theo ID
 */
export function deleteTask(tasks, id) {
    // Lọc ra các công việc có ID khác với ID cần xóa
    return tasks.filter((task) => task.id !== id);
}

/**
 * Tìm và lấy thông tin chi tiết của một công việc theo ID
 */
export function getTaskById(tasks, id) {
    // Trả về phần tử công việc đầu tiên khớp với ID
    return tasks.find((task) => task.id === id);
}

/**
 * Lấy danh sách các công việc đã bị quá hạn
 */
export function getExpiredTasks(tasks, now = new Date()) {
    return tasks.filter((task) => {
        // Nếu không có hạn chót, hoặc đã hoàn thành, hoặc đã được đánh dấu hết hạn trước đó thì bỏ qua
        if (!task.dueDate || task.completed || task.expired) {
            return false;
        }

        // Lấy mốc thời gian timestamp của hạn chót
        const dueTime = new Date(task.dueDate).getTime();
        
        // Kiểm tra thời gian hạn chót hợp lệ và đã nhỏ hơn hoặc bằng thời điểm hiện tại (now) chưa
        return !Number.isNaN(dueTime) && dueTime <= now.getTime();
    });
}

/**
 * Đánh dấu trạng thái hết hạn cho các công việc đã vượt quá thời gian hạn chót
 */
export function markExpiredTasks(tasks, now = new Date()) {
    // Lấy Set chứa tất cả ID của các công việc đã quá hạn
    const expiredIds = new Set(getExpiredTasks(tasks, now).map((task) => task.id));

    // Duyệt qua danh sách công việc và cập nhật các công việc bị quá hạn
    return tasks.map((task) => (
        // Nếu ID của công việc nằm trong danh sách quá hạn
        expiredIds.has(task.id)
            // Cập nhật trạng thái expired = true, ghi nhận thời điểm expiredAt và updatedAt
            ? { ...task, expired: true, expiredAt: now.toISOString(), updatedAt: now.toISOString() }
            // Nếu không thì giữ nguyên công việc
            : task
    ));
}

/**
 * Tính toán các chỉ số thống kê về số lượng công việc
 */
export function getStatistics(tasks) {
    // Đếm số lượng công việc đã hoàn thành
    const completed = tasks.filter((task) => task.completed).length;
    
    // Đếm số lượng công việc đã bị quá hạn
    const expired = tasks.filter((task) => task.expired).length;

    // Trả về đối tượng chứa tổng quan số liệu thống kê
    return {
        total: tasks.length, // Tổng số công việc
        active: tasks.length - completed - expired, // Số công việc còn lại đang chờ làm
        completed, // Số công việc đã hoàn thành
        expired // Số công việc đã quá hạn
    };
}