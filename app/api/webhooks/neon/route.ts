import { NextRequest, NextResponse } from 'next/server';
import { verifyNeonWebhook } from '@/lib/neon-webhook';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const payload = await verifyNeonWebhook(rawBody, request.headers);
        const { event_type, event_data, user } = payload;

        // Route the event
        switch (event_type) {
            case 'send.otp':
                await handleSendOtp(event_data, user);
                return NextResponse.json({ success: true });

            case 'send.magic_link':
                await handleSendMagicLink(event_data, user);
                return NextResponse.json({ success: true });

            case 'user.before_create':
                const validationResult = await handleUserBeforeCreate(user);
                // Blocking events must return specific JSON to allow/deny the action
                return NextResponse.json(validationResult);

            case 'user.created':
                console.log(`New user completely registered: ${user.email}`);
                return NextResponse.json({ success: true });

            default:
                console.log(`Unhandled event type: ${event_type}`);
                return NextResponse.json({ success: true });
        }
    } catch (error: any) {
        console.error('Webhook error:', error.message);
        return NextResponse.json(
            { error: error.message },
            { status: error.message.includes('signature') ? 400 : 500 }
        );
    }
}

async function handleSendOtp(eventData: any, user: any) {
    const { otp_code } = eventData;

    console.log(`Sending custom Resend OTP to ${user.email}`);
    await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
        subject: 'Your Verification Code',
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Welcome to Our App!</h2>
        <p>Your secure verification code is:</p>
        <h1 style="background: #f4f4f5; padding: 16px; letter-spacing: 6px; text-align: center; border-radius: 8px;">
          ${otp_code}
        </h1>
        <p>This code will expire in 15 minutes.</p>
      </div>
    `,
    });
}

async function handleSendMagicLink(eventData: any, user: any) {
    const { link_url, link_type } = eventData;

    console.log(`Sending custom ${link_type} magic link to ${user.email}`);
    await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
        subject: 'Your Secure Sign-in Link',
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Sign in to your account</h2>
        <p>Use the button below to continue:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${link_url}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px;">Open secure link</a>
        </p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    });
}

// Example: Block signups from disposable domains
async function handleUserBeforeCreate(user: any) {
    const blockedDomains = ['spam.com', 'tempmail.org'];
    const userDomain = user.email.split('@')[1];

    if (blockedDomains.includes(userDomain)) {
        console.log(`Blocked signup for domain: ${userDomain}`);
        return {
            allowed: false,
            error_message: "Signups from this domain are not allowed. Please use a work email.",
            error_code: "DOMAIN_BLOCKED"
        };
    }

    return { allowed: true };
}