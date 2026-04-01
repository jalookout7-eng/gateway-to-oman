interface BadgeProps {
  variant:
    | "entrepreneur"
    | "investor"
    | "professional"
    | "retiree"
    | "hot"
    | "warm"
    | "cold"
    | "new"
    | "contacted"
    | "converted"
    | "closed"
    | "in_progress";
  children: React.ReactNode;
}

const BADGE_COLORS: Record<string, string> = {
  entrepreneur: "bg-blue-100 text-blue-800",
  investor: "bg-amber-100 text-amber-800",
  professional: "bg-teal/20 text-teal",
  retiree: "bg-green-100 text-green-800",
  hot: "bg-red-100 text-red-800",
  warm: "bg-orange-100 text-orange-800",
  cold: "bg-blue-100 text-blue-800",
  new: "bg-purple-100 text-purple-800",
  contacted: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  converted: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        BADGE_COLORS[variant] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {children}
    </span>
  );
}
