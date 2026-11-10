import MapApp from "@/components/MapApp";

// Trang chủ (đường dẫn "/"): bản đồ chiếm toàn bộ phần dưới thanh tiêu đề
export default function Home() {
  return (
    <main className="relative h-full">
      <MapApp />
    </main>
  );
}
