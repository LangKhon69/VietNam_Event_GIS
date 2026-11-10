import MapApp from "@/components/MapApp";

// Trang chủ (đường dẫn "/"): thanh tiêu đề + bản đồ chiếm phần còn lại của màn hình
export default function Home() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2">
        <h1 className="text-lg font-bold">Vietnam Event GIS</h1>
        <span className="hidden text-sm text-zinc-500 sm:inline">Bản đồ 34 tỉnh/thành</span>
      </header>
      <main className="relative flex-1">
        <MapApp />
      </main>
    </div>
  );
}
