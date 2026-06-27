import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { type, message } = await req.json();

    await resend.emails.send({
      from: "Testiva Feedback <onboarding@resend.dev>",
      to: ["debatasarthak1@gmail.com"],
      subject: `Testiva Feedback - ${type}`,
      html: `
        <h2>New Feedback Received</h2>

        <p><strong>Type:</strong> ${type}</p>

        <p><strong>Message:</strong></p>

        <p>${message}</p>
      `,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}