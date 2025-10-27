import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full bg-transparent">
      <div className="max-w-4xl mx-auto py-6 flex flex-col items-center text-center gap-2 px-3 text-sm text-[var(--text-primary)]">
        {/* Built with */}
        <div className="flex flex-wrap items-center justify-center gap-2 font-medium">
          <span>Built with</span>

          <a
            href="https://ai-sdk.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:opacity-80 transition"
          >
            <Image
              src="https://vercel.com/favicon.ico"
              alt="Vercel AI SDK"
              width={16}
              height={16}
            />
            <span className="hidden sm:inline">Vercel AI SDK</span>
          </a>

          <span>&</span>

          <a
            href="https://appwrite.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:opacity-80 transition"
          >
            <Image
              src="https://appwrite.io/images/logos/logo.svg"
              alt="Appwrite"
              width={16}
              height={16}
            />
            <span className="hidden sm:inline">Appwrite</span>
          </a>

          <span>by</span>
          <a
            href="http://tanishchowdhury.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Tanish Chowdhury
          </a>
        </div>

        {/* Share / Sponsor */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-center sm:text-left">
          <div>
            If you liked it, <span>share it with your friends!</span>
          </div>
          <span className="hidden sm:inline">·</span>
          
        </div>
      </div>
    </footer>
  );
}
