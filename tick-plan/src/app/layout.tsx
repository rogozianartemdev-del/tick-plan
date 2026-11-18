import { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";


export const metadata: Metadata = {
    title: "Tick Plan",
    description: "Календар для планування ваших подій",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="uk">
            <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
                {children}
                <Toaster richColors position="top-right" />
            </body>
        </html>
    );
}

