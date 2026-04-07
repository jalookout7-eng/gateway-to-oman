import ical from "ical-generator";

export function generateBookingConfirmationEmail(params: {
  leadName: string;
  leadEmail: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  ahmedEmail: string;
}): { subject: string; html: string; icsAttachment: string } {
  const { leadName, date, time, ahmedEmail } = params;

  // Parse Oman time (GMT+4) directly using ISO 8601 offset notation
  const startDate = new Date(`${date}T${time}:00+04:00`);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const cal = ical({ name: "Gateway to Oman Consultation" });
  cal.createEvent({
    start: startDate,
    end: endDate,
    summary: `Consultation with Ahmed Al-Azizi — Gateway to Oman`,
    description: `Your consultation with Ahmed Al-Azizi at Gateway to Oman.\n\nContact: ${ahmedEmail}`,
    organizer: { name: "Ahmed Al-Azizi", email: ahmedEmail },
    attendees: [{ name: leadName, email: params.leadEmail }],
  });

  const icsAttachment = cal.toString();

  const displayDate = new Date(`${date}T00:00:00+04:00`).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Muscat",
  });
  const displayTime = `${time} (Oman Time, GMT+4)`;

  const subject = `Your consultation with Ahmed Al-Azizi is confirmed`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="background: linear-gradient(135deg, #C99B3C, #E8C777); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Gateway to Oman</h1>
      </div>
      <div style="padding: 32px; background: #f8f5f0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">Hi ${leadName},</p>
        <p>Your consultation with <strong>Ahmed Al-Azizi</strong> is confirmed.</p>
        <div style="background: white; border-left: 4px solid #C99B3C; padding: 16px; border-radius: 4px; margin: 24px 0;">
          <p style="margin: 0; font-size: 15px;"><strong>Date:</strong> ${displayDate}</p>
          <p style="margin: 8px 0 0; font-size: 15px;"><strong>Time:</strong> ${displayTime}</p>
        </div>
        <p>Ahmed will be in touch before the meeting to confirm the format (call, video, or in-person).</p>
        <p style="color: #888; font-size: 13px;">The .ics file attached can be added to your calendar.</p>
      </div>
    </div>
  `;

  return { subject, html, icsAttachment };
}
