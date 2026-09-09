/**
 * Kiểm tra xem một mốc thời gian hạn chót (dueDate) có phải là ngày hôm nay hay không
 * @param {string|Date} dueDate - Chuỗi hoặc đối tượng thời gian hạn chót
 * @param {Date} now - Mốc thời gian hiện tại dùng làm mốc so sánh
 * @returns {boolean} Kết quả kiểm tra (true/false)
 */
function isDueToday(dueDate, now) {
    // Nếu không có hạn chót thì trả về false ngay lập tức
    if (!dueDate) {
        return false;
    }

    // Chuyển hạn chót về đối tượng Date
    const due = new Date(dueDate);

    // Kiểm tra xem hạn chót có hợp lệ và trùng khớp Năm, Tháng, Ngày với mốc hiện tại (now) hay không
    return !Number.isNaN(due.getTime())
        && due.getFullYear() === now.getFullYear()
        && due.getMonth() === now.getMonth()
        && due.getDate() === now.getDate();
}

/**
 * Lọc danh sách công việc theo nhiều tiêu chí khác nhau
 * @param {Array} tasks - Danh sách công việc
 * @param {string} filterValue - Tiêu chí lọc (active, completed, expired, priority, due-today,...)
 * @param {Date} now - Mốc thời gian hiện tại
 * @returns {Array} Danh sách công việc đã được lọc
 */
export function filterTasks(tasks, filterValue, now = new Date()) {
    // Chuẩn hóa tiêu chí lọc: Ép về kiểu chuỗi chữ thường, mặc định là "all" nếu null/undefined
    switch (String(filterValue ?? "all").toLowerCase()) {
        // Lọc các công việc đang chờ làm (chưa hoàn thành và chưa hết hạn)
        case "active":
            return tasks.filter((task) => !task.completed && !task.expired);

        // Lọc các công việc đã hoàn thành
        case "completed":
            return tasks.filter((task) => task.completed);

        // Lọc các công việc đã bị quá hạn
        case "expired":
            return tasks.filter((task) => task.expired);

        // Lọc theo các mức độ ưu tiên: high, medium, low
        case "high":
        case "medium":
        case "low":
            return tasks.filter((task) => task.priority === filterValue);

        // Lọc các công việc có hạn chót vào ngày hôm nay (chưa hoàn thành và chưa bị quá hạn)
        case "due-today":
            return tasks.filter((task) => !task.completed && !task.expired && isDueToday(task.dueDate, now));

        // Lọc các công việc không thiết lập ngày hạn chót
        case "no-due-date":
            return tasks.filter((task) => !task.dueDate);

        // Mặc định ("all" hoặc giá trị khác không khớp): Trả về nguyên vẹn danh sách công việc
        default:
            return tasks;
    }
}

/**
 * Sắp xếp danh sách công việc theo thứ tự mong muốn
 * @param {Array} tasks - Danh sách công việc
 * @param {string} sortValue - Tiêu chí sắp xếp ("priority", "newest", hoặc sắp xếp theo hạn chót mặc định)
 * @returns {Array} Danh sách công việc mới đã qua sắp xếp
 */
export function sortTasks(tasks, sortValue) {
    // Bảng quy đổi trọng số độ ưu tiên (số nhỏ hơn sẽ đứng trước)
    const priorityWeight = { high: 0, medium: 1, low: 2 };

    // Hàm phụ trợ: Lấy mốc thời gian timestamp của hạn chót
    const getDueTime = (task) => {
        const dueTime = new Date(task.dueDate).getTime();
        // Nếu không có hạn chót hoặc ngày không hợp lệ thì gán giá trị Vô cùng lớn (để đẩy task xuống cuối)
        return Number.isNaN(dueTime) ? Number.POSITIVE_INFINITY : dueTime;
    };

    // Sắp xếp trên bản sao mảng [...tasks] để tránh làm thay đổi mảng gốc (immutability)
    return [...tasks].sort((first, second) => {
        // Trường hợp 1: Sắp xếp theo Độ ưu tiên
        if (sortValue === "priority") {
            // Ưu tiên cao đứng trước. Nếu độ ưu tiên bằng nhau thì so sánh tiếp theo Hạn chót (gần nhất đứng trước)
            return priorityWeight[first.priority] - priorityWeight[second.priority]
                || getDueTime(first) - getDueTime(second);
        }

        // Trường hợp 2: Sắp xếp theo Mới nhất (thời gian tạocreatedAt giảm dần)
        if (sortValue === "newest") {
            return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
        }

        // Trường hợp 3 (Mặc định): Sắp xếp theo Hạn chót (thời gian tăng dần, hạn chót gần nhất đứng trước)
        return getDueTime(first) - getDueTime(second);
    });
}