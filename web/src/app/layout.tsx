import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Font Inter có bộ ký tự "vietnamese" để hiển thị đúng dấu tiếng Việt
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

// metadata: tiêu đề tab trình duyệt và mô tả trang (dùng cho SEO)
export const metadata: Metadata = {
  title: "Vietnam Event GIS",
  description:
    "Bản đồ tương tác sự kiện và địa điểm trên 34 tỉnh/thành Việt Nam",
};

// Layout gốc: bọc quanh mọi trang của ứng dụng
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
