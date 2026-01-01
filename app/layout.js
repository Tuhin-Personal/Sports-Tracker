import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "NFL Stats Tracker",
  description: "My awesome football website",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ margin: 0, backgroundColor: "#f4f4f9" }}>
        
        {/* IMPROVED NAVIGATION BAR */}
        <nav style={{ 
          backgroundColor: "#202932", 
          padding: "20px", 
          display: "flex", 
          gap: "30px", 
          justifyContent: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)" 
        }}>
          <Link href="/" style={navLinkStyle}>🏠 Home</Link>
          <Link href="/teams" style={navLinkStyle}>🛡️ Teams</Link>
          <Link href="/standings" style={navLinkStyle}>🏆 Standings</Link>
          <Link href="/playoffs" style={navLinkStyle}>⭐ Road to Superbowl</Link>
        </nav>

        {children}
      </body>
    </html>
  );
}

// Simple reusable style for your navigation links
const navLinkStyle = {
  color: "white", 
  textDecoration: "none", 
  fontWeight: "bold",
  fontSize: "0.95rem",
  transition: "opacity 0.2s"
};