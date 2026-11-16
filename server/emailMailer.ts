import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const DEFAULT_COMPANY_EMAIL = 'farmbridge2026@gmail.com';

let adminAppInstance: App | null = null;
let adminInitAttempted = false;

function readFirebaseProjectId(): string | undefined {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (typeof parsed?.projectId === 'string' && parsed.projectId.trim()) {
        return parsed.projectId.trim();
      }
    }
  } catch {
    // Ignore read errors
  }
  return undefined;
}

function getFirebaseAdminApp(): App | null {
  if (adminAppInstance) return adminAppInstance;
  const existing = getApps();
  if (existing.length > 0) {
    adminAppInstance = existing[0];
    return adminAppInstance;
  }
  if (adminInitAttempted) return null;
  adminInitAttempted = true;

  const projectId = readFirebaseProjectId();
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();

  if (rawServiceAccount) {
    try {
      const jsonStr = rawServiceAccount.startsWith('{')
        ? rawServiceAccount
        : Buffer.from(rawServiceAccount, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(jsonStr);
      adminAppInstance = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      return adminAppInstance;
    } catch (err) {
      console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT_KEY for email verification links:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      adminAppInstance = initializeApp({
        credential: applicationDefault(),
        projectId
      });
      return adminAppInstance;
    } catch {
      return null;
    }
  }

  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getVerificationEmailConfigStatus() {
  const smtpUser = (process.env.SMTP_USER || DEFAULT_COMPANY_EMAIL).trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpFrom = (process.env.SMTP_FROM || `FarmBridge <${smtpUser}>`).trim();
  const companySmtpConfigured = Boolean(smtpUser && smtpPass);
  const firebaseAdminConfigured = Boolean(getFirebaseAdminApp());

  return {
    companySmtpConfigured,
    firebaseAdminConfigured,
    ready: companySmtpConfigured && firebaseAdminConfigured,
    senderEmail: smtpUser,
    senderFrom: smtpFrom
  };
}

export async function sendCompanyVerificationEmail(params: {
  idToken: string;
  continueUrl?: string;
  newEmail?: string;
}): Promise<{
  sent: boolean;
  fallbackToFirebaseDefault: boolean;
  senderEmail: string;
  reason?: string;
}> {
  const status = getVerificationEmailConfigStatus();

  if (!status.companySmtpConfigured) {
    return {
      sent: false,
      fallbackToFirebaseDefault: true,
      senderEmail: status.senderEmail,
      reason: 'SMTP_PASS is not configured in server environment secrets.'
    };
  }

  const adminApp = getFirebaseAdminApp();
  if (!adminApp) {
    return {
      sent: false,
      fallbackToFirebaseDefault: true,
      senderEmail: status.senderEmail,
      reason: 'FIREBASE_SERVICE_ACCOUNT_KEY is not configured in server environment secrets.'
    };
  }

  try {
    const adminAuth = getAuth(adminApp);
    const decoded = await adminAuth.verifyIdToken(params.idToken);
    const currentEmail = decoded.email;
    const recipientEmail = (params.newEmail || currentEmail || '').trim();

    if (!recipientEmail) {
      return {
        sent: false,
        fallbackToFirebaseDefault: true,
        senderEmail: status.senderEmail,
        reason: 'Authenticated user has no email address.'
      };
    }

    const actionCodeSettings = params.continueUrl
      ? { url: params.continueUrl, handleCodeInApp: false }
      : undefined;

    let verificationLink: string;
    if (params.newEmail && currentEmail && params.newEmail.trim().toLowerCase() !== currentEmail.toLowerCase()) {
      verificationLink = await adminAuth.generateVerifyAndChangeEmailLink(
        currentEmail,
        params.newEmail.trim(),
        actionCodeSettings
      );
    } else {
      verificationLink = await adminAuth.generateEmailVerificationLink(
        recipientEmail,
        actionCodeSettings
      );
    }

    const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpSecure = process.env.SMTP_SECURE !== 'false' && smtpPort === 465;
    const smtpUser = status.senderEmail;
    const smtpPass = (process.env.SMTP_PASS || '').trim();

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const displayName = decoded.name || 'FarmBridge Member';
    const safeName = escapeHtml(displayName);
    const safeUrl = escapeHtml(verificationLink);

    await transporter.sendMail({
      from: status.senderFrom,
      replyTo: smtpUser,
      to: recipientEmail,
      subject: 'Verify your FarmBridge account email address',
      text: [
        `Hello ${displayName},`,
        '',
        'Welcome to FarmBridge Agricultural Marketplace!',
        'Please verify your email address by opening the link below to activate your account:',
        '',
        verificationLink,
        '',
        'If you did not create a FarmBridge account, you can safely ignore this message.',
        '',
        '— FarmBridge Marketplace Team',
        smtpUser
      ].join('\n'),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#F8FAF7; padding:32px 16px; color:#062B1F;">
          <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:20px; border:1px solid #DFF4E4; overflow:hidden; box-shadow:0 12px 32px rgba(6,43,31,0.08);">
            <div style="background:linear-gradient(135deg, #062B1F 0%, #145A38 100%); padding:24px 28px; color:#ffffff;">
              <div style="font-size:20px; font-weight:800; letter-spacing:-0.02em;">
                FarmBridge<span style="color:#A8E635;">.</span>
              </div>
              <div style="font-size:12px; color:#DFF4E4; margin-top:4px;">
                Direct Agricultural Marketplace
              </div>
            </div>
            <div style="padding:28px;">
              <h1 style="margin:0 0 12px; font-size:20px; color:#062B1F;">Verify your email address</h1>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#2B4338;">
                Hello ${safeName},<br /><br />
                Thank you for joining <strong>FarmBridge</strong>. Please confirm your email address using the button below to activate your account and unlock full marketplace features.
              </p>
              <div style="margin:24px 0; text-align:center;">
                <a href="${safeUrl}" style="display:inline-block; background:#A8E635; color:#062B1F; font-weight:800; font-size:14px; text-decoration:none; padding:13px 26px; border-radius:12px;">
                  Verify Email Address
                </a>
              </div>
              <p style="margin:0 0 8px; font-size:12px; color:#4A6458;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 20px; font-size:11px; word-break:break-all; color:#145A38;">
                ${safeUrl}
              </p>
              <hr style="border:none; border-top:1px solid #E6F2EA; margin:20px 0;" />
              <p style="margin:0; font-size:11px; color:#647D72;">
                If you didn't request this verification email, you can safely ignore it. Need assistance? Reply to ${escapeHtml(smtpUser)}.
              </p>
            </div>
          </div>
        </div>
      `
    });

    return {
      sent: true,
      fallbackToFirebaseDefault: false,
      senderEmail: smtpUser
    };
  } catch (err: any) {
    console.warn('Company SMTP email verification fallback triggered:', err?.message || err);
    return {
      sent: false,
      fallbackToFirebaseDefault: true,
      senderEmail: status.senderEmail,
      reason: err?.message || 'Company SMTP relay failed; falling back to Firebase mailer.'
    };
  }
}
