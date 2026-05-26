import Link from "next/link";
import { EFFECTIVE_DATE } from "./CompanyFacts";

interface Props {
  title: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, children }: Props) {
  return (
    <main className="min-h-screen bg-[#F8F5F0] px-4 py-12 md:py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-500 hover:text-navy transition-colors">
          &larr; Back to Gateway to Oman
        </Link>
        <h1 className="mt-4 font-heading text-3xl md:text-4xl font-semibold text-navy">
          {title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">Effective date: {EFFECTIVE_DATE}</p>
        <div className="mt-8 max-w-none text-gray-800 leading-relaxed
                        [&_h2]:font-heading [&_h2]:text-navy [&_h2]:font-semibold
                        [&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-3
                        [&_h3]:font-heading [&_h3]:text-navy [&_h3]:font-semibold
                        [&_h3]:text-base [&_h3]:mt-6 [&_h3]:mb-2
                        [&_p]:text-[15px] [&_p]:mb-4
                        [&_ul]:text-[15px] [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6
                        [&_li]:mb-1
                        [&_a]:text-gold [&_a:hover]:underline
                        [&_strong]:font-semibold
                        [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                        [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_table]:mb-4
                        [&_th]:text-navy [&_th]:font-semibold [&_th]:text-left [&_th]:p-2 [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50
                        [&_td]:p-2 [&_td]:border [&_td]:border-gray-200 [&_td]:align-top
                        [&_section]:mb-6">
          {children}
        </div>
        <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/privacy" className="hover:text-navy transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-navy transition-colors">Terms of Service</Link>
          <Link href="/cookies" className="hover:text-navy transition-colors">Cookie Notice</Link>
        </div>
      </article>
    </main>
  );
}
