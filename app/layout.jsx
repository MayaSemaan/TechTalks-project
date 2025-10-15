import "./globals.css";

export const metadata = {
  title: "Smart Medicine Reminder Dashboard",
  description: "Track medications, doctor reports, and reminders easily.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-800 font-sans">
        {/* Header */}
        <header className="bg-blue-600 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">💊 Smart Medicine Reminder</h1>
            <nav className="space-x-6">
              <a href="/" className="hover:underline">Home</a>
              <a href="/dashboard" className="hover:underline">Dashboard</a>
              <a href="/medications" className="hover:underline">Medications</a>
              <a href="/doctor/reports" className="hover:underline">Reports</a>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-gray-200 text-center py-4 text-sm mt-10">
          © {new Date().getFullYear()} Smart Medicine Reminder — All Rights Reserved.
        </footer>
      </body>
    </html>
  );
}
