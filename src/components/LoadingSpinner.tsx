import { motion } from "framer-motion";

const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <motion.div
        className="relative h-12 w-12"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {/* Neo Brutalism Spinner - Square with offset shadow */}
        <div 
          className="absolute inset-0 border-4 border-foreground bg-primary"
          style={{ boxShadow: '4px 4px 0px 0px hsl(var(--foreground))' }}
        />
        <div 
          className="absolute inset-2 border-2 border-foreground bg-background"
          style={{ boxShadow: '2px 2px 0px 0px hsl(var(--foreground))' }}
        />
      </motion.div>
    </div>
  );
};

export default LoadingSpinner;
