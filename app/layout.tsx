import type { Metadata } from "next"
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"

const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
})

const fontSans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Office Hours — Chat with Hitesh Choudhary & Piyush Garg",
  description:
    "Sit across the desk from your favourite dev teacher. An AI that talks like Hitesh Choudhary or Piyush Garg — their voice, their teaching style, in Hinglish.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark antialiased",
        fontDisplay.variable,
        fontSans.variable,
        fontMono.variable,
      )}
    >
      <body className="font-sans">{children}</body>
    </html>
  )
}
