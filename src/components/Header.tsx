import { motion } from "framer-motion";

const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-center py-8 md:py-10"
    >
      <div className="border-2 border-foreground bg-primary px-6 py-3 md:px-8 md:py-4"
        style={{ boxShadow: '5px 5px 0px 0px hsl(var(--foreground))' }}>
        <h1 className="text-2xl font-black uppercase tracking-wider text-primary-foreground md:text-4xl">
          TikTok <span className="bg-background px-2 text-foreground">Downloader</span>
        </h1>
      </div>
    </motion.header>
  );
};

export default Header;
