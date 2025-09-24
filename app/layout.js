import "./globals.css";

export const metadata = {
  title: "Doctor Reports",
  description: "Upload and view reports",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-800">{children}</body>
    </html>
  );
}
