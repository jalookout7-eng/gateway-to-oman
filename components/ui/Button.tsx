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
    "font-semibold rounded-lg transition-all duration-200 inline-flex items-center justify-center";

  const variants = {
    gold: "gold-gradient text-white hover:shadow-lg hover:shadow-gold/30 hover:-translate-y-0.5",
    outline: "border-2 border-gold text-gold hover:bg-gold hover:text-white",
    ghost: "text-gold hover:bg-gold/10",
    navy: "bg-navy text-white hover:bg-navy-light",
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
