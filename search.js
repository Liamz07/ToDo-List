/**
 * Tìm kiếm danh sách công việc theo từ khóa
 * @param {Array} tasks - Danh sách các công việc
 * @param {string} searchTerm - Từ khóa tìm kiếm nhập từ người dùng
 * @returns {Array} Danh sách công việc khớp với từ khóa
 */
export function searchTasks(tasks, searchTerm) {
    // Chuẩn hóa từ khóa: Ép về kiểu chuỗi, xóa khoảng trắng thừa ở 2 đầu và chuyển về chữ thường (hỗ trợ tốt hơn cho ngôn ngữ địa phương)
    const term = String(searchTerm ?? "").trim().toLocaleLowerCase();

    // Nếu không nhập từ khóa (hoặc từ khóa rỗng), trả về nguyên vẹn toàn bộ danh sách công việc ban đầu
    if (!term) {
        return tasks;
    }

    // Lọc và trả về danh sách các công việc có tiêu đề (title) chứa từ khóa tìm kiếm (không phân biệt chữ hoa/chữ thường)
    return tasks.filter((task) => task.title.toLocaleLowerCase().includes(term));
}