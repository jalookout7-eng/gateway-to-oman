"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, MessageSquare, Users, Tags } from "lucide-react";
import { CollapsibleSection } from "@/components/admin/CollapsibleSection";
import { AdminUsersSection } from "@/components/admin/AdminUsersSection";
import { LeadOptionsSection } from "@/components/admin/LeadOptionsSection";

function authHeaders() {
  return { "Content-Type": "application/json" };
}

const PROVIDERS = [
  { id: "smtp", label: "Custom SMTP" },
  { id: "resend", label: "Resend" },
  { id: "sendgrid", label: "SendGrid" },
];

export default function SettingsPage() {
  const [provider, setProvider] = useState("smtp");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [sendgridKey, setSendgridKey] = useState("");
  const [fromName, setFromName] = useState("Ahmed Al-Azizi — Gateway to Oman");
  const [fromAddress, setFromAddress] = useState("");
  const [replyTo, setReplyTo] = useState("azizi@alazizigroup.com");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testSending, setTestSending] = useState(false);

  // Chatbot settings
  const [greeting, setGreeting] = useState("");
  const [autoOpenDelay, setAutoOpenDelay] = useState("7");
  const [autoSendEmail, setAutoSendEmail] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const res = await fetch("/api/email/config", { headers: authHeaders(), credentials: "include" });
      if (res.ok) {
        const config = await res.json();
        if (config.email_provider) setProvider(config.email_provider);
        if (config.email_smtp_host) setSmtpHost(config.email_smtp_host);
        if (config.email_smtp_port) setSmtpPort(config.email_smtp_port);
        if (config.email_smtp_user) setSmtpUser(config.email_smtp_user);
        if (config.email_smtp_pass) setSmtpPass(config.email_smtp_pass);
        if (config.email_resend_key) setResendKey(config.email_resend_key);
        if (config.email_sendgrid_key) setSendgridKey(config.email_sendgrid_key);
        if (config.email_from_name) setFromName(config.email_from_name);
        if (config.email_from_address) setFromAddress(config.email_from_address);
        if (config.email_reply_to) setReplyTo(config.email_reply_to);
        if (config.email_auto_send) setAutoSendEmail(config.email_auto_send === "true");
        if (config.chatbot_greeting) setGreeting(config.chatbot_greeting);
        if (config.chatbot_auto_open_delay) setAutoOpenDelay(config.chatbot_auto_open_delay);
      }
    }
    loadConfig();
  }, []);

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const settings: Record<string, string> = {
      email_provider: provider,
      email_from_name: fromName,
      email_from_address: fromAddress,
      email_reply_to: replyTo,
      email_auto_send: autoSendEmail ? "true" : "false",
    };

    if (provider === "smtp") {
      settings.email_smtp_host = smtpHost;
      settings.email_smtp_port = smtpPort;
      settings.email_smtp_user = smtpUser;
      settings.email_smtp_pass = smtpPass;
    } else if (provider === "resend") {
      settings.email_resend_key = resendKey;
    } else if (provider === "sendgrid") {
      settings.email_sendgrid_key = sendgridKey;
    }

    const res = await fetch("/api/email/config", {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(settings),
    });

    setSaving(false);
    if (res.ok) setSaved(true);
  }

  async function handleSaveChatbot() {
    setSaving(true);
    await fetch("/api/email/config", {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({
        chatbot_greeting: greeting,
        chatbot_auto_open_delay: autoOpenDelay,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  async function handleTestEmail() {
    if (!testEmail) return;
    setTestSending(true);
    setTestStatus(null);

    const res = await fetch("/api/email/test", {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({ to: testEmail }),
    });

    setTestSending(false);
    if (res.ok) {
      setTestStatus("Test email sent successfully!");
    } else {
      const data = await res.json();
      setTestStatus(`Failed: ${data.error}`);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-navy">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Email, chatbot, and admin user configuration.
        </p>
      </div>

      <CollapsibleSection
        title="Email configuration"
        subtitle="Provider, sender identity, and test sending"
        icon={<Mail className="h-4 w-4" />}
        defaultOpen={false}
      >
        {/* Provider tabs */}
        <div className="flex border-b border-gray-200">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                provider === p.id
                  ? "border-gold text-gold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSaveEmail} className="space-y-4">
          {/* Provider-specific fields */}
          {provider === "smtp" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="SMTP Host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
                <Input label="SMTP Port" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
              </div>
              <Input label="Username" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="user@example.com" />
              <Input label="Password" type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="App password" />
            </div>
          )}

          {provider === "resend" && (
            <Input label="Resend API Key" value={resendKey} onChange={(e) => setResendKey(e.target.value)} placeholder="re_..." />
          )}

          {provider === "sendgrid" && (
            <Input label="SendGrid API Key" value={sendgridKey} onChange={(e) => setSendgridKey(e.target.value)} placeholder="SG...." />
          )}

          {/* Common fields */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <Input label="From Name" value={fromName} onChange={(e) => setFromName(e.target.value)} />
            <Input label="From Address" type="email" value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="hello@yourdomain.com" />
            <Input label="Reply-To" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoSendEmail}
                onChange={(e) => setAutoSendEmail(e.target.checked)}
                className="rounded border-gray-300 text-gold focus:ring-gold"
              />
              Auto-send welcome email when lead is captured
            </label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" variant="gold" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Email Settings"}
            </Button>
            {saved && <span className="text-sm text-green-600 self-center">Saved!</span>}
          </div>
        </form>

        {/* Test email */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Send Test Email</p>
          <div className="flex gap-2">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={testSending}>
              {testSending ? "Sending..." : "Send Test"}
            </Button>
          </div>
          {testStatus && (
            <p className={`text-sm ${testStatus.startsWith("Failed") ? "text-red-500" : "text-green-600"}`}>
              {testStatus}
            </p>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Chatbot settings"
        subtitle="Custom greeting and auto-open delay"
        icon={<MessageSquare className="h-4 w-4" />}
        defaultOpen={false}
      >
        <div className="space-y-3 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Greeting</label>
            <textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Leave empty for default greeting..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-warm-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all text-sm"
            />
          </div>

          <Input
            label="Auto-open delay (seconds)"
            type="number"
            value={autoOpenDelay}
            onChange={(e) => setAutoOpenDelay(e.target.value)}
            min="0"
            max="60"
          />
        </div>

        <div className="mt-4">
          <Button variant="gold" size="sm" onClick={handleSaveChatbot} disabled={saving}>
            {saving ? "Saving..." : "Save Chatbot Settings"}
          </Button>
          {saved && <span className="text-sm text-green-600 ml-3">Saved!</span>}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Lead options"
        subtitle="Admin-editable status, qualification, and segment values"
        icon={<Tags className="h-4 w-4" />}
        defaultOpen={false}
      >
        <LeadOptionsSection />
      </CollapsibleSection>

      <CollapsibleSection
        title="Admin users"
        subtitle="People who can sign into this dashboard"
        icon={<Users className="h-4 w-4" />}
        defaultOpen={false}
      >
        <AdminUsersSection />
      </CollapsibleSection>
    </div>
  );
}
