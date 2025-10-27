import "./globals.css";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata = {
  title: {
    default: "ErrInsight | Turn Cryptic Errors into Plain English",
    template: "%s | ErrInsight",
  },
  description:
    "AI-powered error analysis tool that converts cryptic programming errors into plain English explanations with actionable solutions. Supports 20+ programming languages.",
  openGraph: {
    title: "ErrInsight - AI Error Analysis Tool",
    description:
      "Instantly translate complex error messages into understandable explanations with AI-powered solutions.",
    siteName: "ErrInsight",
    url: "https://errinsight.vercel.app", // UPDATE THIS
    type: "website",
    images: [
      {
        url: "https://errinsight.vercel.app/errinsight.png", // UPDATE THIS
        width: 1200,
        height: 630,
        alt: "ErrInsight - Turn Cryptic Errors into Plain English",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ErrInsight - AI Error Analysis Tool",
    description:
      "Instantly translate complex error messages into understandable explanations with AI-powered solutions.",
    images: "https://errinsight.vercel.app/errinsight.png", // UPDATE THIS
  },
  robots: "index,follow",
  canonical: "https://errinsight.vercel.app", // UPDATE THIS
  keywords:
    "error analysis, AI debugging, developer tools, error translator, programming errors, bug fixing, Groq AI, Llama 4, Next.js, error explanations",
  author: "Tanish Chowdhury", // UPDATE WITH YOUR NAME
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          type="image/x-icon"
          href="/favicon.ico"
          sizes="32x32"
        />
        <meta name="description" content={metadata.description} />
        <meta name="robots" content={metadata.robots} />
        <meta name="twitter:card" content={metadata.twitter.card} />
        <meta property="og:title" content={metadata.openGraph.title} />
        <meta
          property="og:description"
          content={metadata.openGraph.description}
        />
        <meta property="og:url" content={metadata.openGraph.url} />
        <meta property="og:image" content={metadata.openGraph.images[0].url} />
        <meta
          property="og:image:alt"
          content={metadata.openGraph.images[0].alt}
        />
        <meta
          property="og:image:width"
          content={metadata.openGraph.images[0].width}
        />
        <meta
          property="og:image:height"
          content={metadata.openGraph.images[0].height}
        />
        <meta property="og:site_name" content={metadata.openGraph.siteName} />
        <link rel="canonical" href={metadata.canonical} />
        <meta name="keywords" content={metadata.keywords} />
        <meta name="author" content={metadata.author} />
      </head>
      <body className="font-sans antialiased transition-colors duration-300">
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 flex justify-center pt-16 md:pt-20">
              <div className="w-full max-w-4xl px-2 sm:px-4">{children}</div>
            </main>
            <Footer />
          </div>
          <Toaster position="bottom-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}