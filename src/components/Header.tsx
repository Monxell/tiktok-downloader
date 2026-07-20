import { motion } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";

const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-between py-6 md:py-8"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-primary shadow-[3px_3px_0px_0px_hsl(var(--foreground))]">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5 text-primary-foreground"
          >
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
          TikTok <span className="text-primary">Downloader</span>
        </h1>
      </div>
      <ThemeToggle />
    </motion.header>
  );
};

export default Header;
