import { motion } from "framer-motion";

const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center py-6">
      <motion.div
        className="relative h-14 w-14"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {/* Soft Neo-Brutalism Spinner */}
        <div 
          className="absolute inset-0 rounded-xl border-3 border-foreground bg-primary"
          style={{ boxShadow: '4px 4px 0px 0px hsl(var(--foreground))' }}
        />
        <div 
          className="absolute inset-3 rounded-lg border-2 border-foreground bg-background"
          style={{ boxShadow: '2px 2px 0px 0px hsl(var(--foreground))' }}
        />
        <div 
          className="absolute inset-5 rounded-md border-2 border-foreground bg-primary"
          style={{ boxShadow: '1px 1px 0px 0px hsl(var(--foreground))' }}
        />
      </motion.div>
    </div>
  );
};

export default LoadingSpinner;
