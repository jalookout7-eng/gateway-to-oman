import { MessageCircle } from "lucide-react";

export function WhatsAppHandoffButton({ href }: { href: string }) {
  return (
    <div className="px-4 pb-3">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Continue on WhatsApp with Ahmed
      </a>
    </div>
  );
}
