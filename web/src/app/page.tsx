// Trang chủ (đường dẫn "/"). Bước 0 chỉ là trang chào; bản đồ sẽ thay vào ở Bước 1.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Vietnam Event GIS</h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Bản đồ tương tác sự kiện và địa điểm trên 34 tỉnh/thành Việt Nam.
      </p>
      <p className="rounded-full bg-emerald-100 px-4 py-1 text-sm text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
        Bước 0: khởi tạo xong, ứng dụng Next.js đang chạy
      </p>
    </main>
  );
}
