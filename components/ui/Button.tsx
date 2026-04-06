"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gold" | "outline" | "ghost" | "navy";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "gold",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "font-semibold rounded-lg transition-all duration-200 inline-flex items-center justify-center cursor-pointer font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

  const variants = {
    gold: "gold-gradient text-white shadow-md shadow-gold/20 hover:shadow-lg hover:shadow-gold/30 hover:-translate-y-0.5 active:translate-y-0",
    outline: "border-2 border-gold text-gold hover:bg-gold hover:text-white active:scale-95",
    ghost: "text-gold hover:bg-gold/10 active:bg-gold/20",
    navy: "bg-navy text-white hover:bg-navy-light active:scale-95",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
