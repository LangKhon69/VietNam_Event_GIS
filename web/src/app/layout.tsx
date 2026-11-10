import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// Font Inter có bộ ký tự "vietnamese" để hiển thị đúng dấu tiếng Việt
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

// metadata: tiêu đề tab trình duyệt và mô tả trang (dùng cho SEO)
export const metadata: Metadata = {
  title: "Vietnam Event GIS",
  description: "Bản đồ tương tác sự kiện và địa điểm trên 34 tỉnh/thành Việt Nam",
};

// Layout gốc: bọc quanh mọi trang. AuthProvider chia sẻ trạng thái đăng nhập cho mọi trang.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="flex h-dvh flex-col bg-zinc-50">
        <AuthProvider>
          <SiteHeader />
          {/* Phần nội dung chiếm chỗ còn lại; trang dài thì cuộn bên trong */}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
