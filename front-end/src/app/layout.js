import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";

export const metadata = {
  title: "Homiqly - Home Services",
  description: "Book professional home services at your doorstep",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}