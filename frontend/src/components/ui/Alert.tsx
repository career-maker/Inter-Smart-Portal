"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion, type Variants } from "framer-motion";

interface AlertProps {
  type?: "success" | "error" | "warning" | "info";
  message?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

const typeStyles = {
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10",
  error: "bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-rose-500/10",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-amber-500/10",
  info: "bg-sky-500/10 text-sky-300 border-sky-500/30 shadow-sky-500/10",
};

const fadeInBlur: Variants = {
  initial: { opacity: 0, filter: "blur(10px)", y: 10, rotate: 0 },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    rotate: 0,
    transition: { duration: 0.25, ease: "easeInOut" },
  },
  exit: {
    opacity: 0,
    filter: "blur(8px)",
    y: -10,
    transition: { duration: 0.2, ease: "easeInOut" },
  },
};

export const Alert: React.FC<AlertProps> = ({
  type = "info",
  message = "This is an alert message.",
  onClick,
  className,
}) => {
  return (
    <motion.div
      className={cn(
        "border px-4 py-3 flex gap-x-2 items-center rounded-2xl text-sm backdrop-blur-md shadow-lg",
        typeStyles[type],
        className
      )}
      role="alert"
      variants={fadeInBlur}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={{
        scale: 1.01,
        rotate: 0.5,
        transition: {
          duration: 0.2,
          ease: "easeInOut",
        },
      }}
      whileTap={{
        scale: 0.99,
        transition: {
          duration: 0.2,
          ease: "easeInOut",
        },
      }}
      onClick={onClick}
    >
      <span className="font-bold capitalize">{type}:</span>
      <span>{message}</span>
    </motion.div>
  );
};

export default Alert;
