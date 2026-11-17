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
      console.warn(
        'Could not parse FIREBASE_SERVICE_ACCOUNT_KEY for email verification links:',
        err instanceof Error ? err.message : err
      );
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

function getSmtpSettings() {
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const parsedPort = Number(process.env.SMTP_PORT || 465);
  const smtpPort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 465;
  const smtpSecure = process.env.SMTP_SECURE !== 'false' && smtpPort === 465;
  const smtpUser = (process.env.SMTP_USER || DEFAULT_COMPANY_EMAIL).trim();
  const rawPass = (process.env.SMTP_PASS || '').trim();
  const isGmail = smtpHost.toLowerCase().includes('gmail.com');
  // Google displays 16-char App Passwords with spaces ("xxxx xxxx xxxx xxxx"); strip spaces cleanly
  const smtpPass = isGmail ? rawPass.replace(/\s+/g, '') : rawPass;
  const smtpFrom = (process.env.SMTP_FROM || `FarmBridge <${smtpUser}>`).trim();

  return {
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpFrom,
    isGmail
  };
}

function createSmtpTransporter() {
  const settings = getSmtpSettings();

  const transportConfig: Record<string, any> = settings.isGmail
    ? {
        service: 'gmail',
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        requireTLS: !settings.smtpSecure,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass
        },
        tls: {
          minVersion: 'TLSv1.2'
        }
      }
    : {
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        requireTLS: !settings.smtpSecure,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass
        }
      };

  return {
    transporter: nodemailer.createTransport(transportConfig),
    ...settings
  };
}

export function getVerificationEmailConfigStatus() {
  const settings = getSmtpSettings();
  const companySmtpConfigured = Boolean(settings.smtpUser && settings.smtpPass);
  const firebaseAdminConfigured = Boolean(getFirebaseAdminApp());

  return {
    companySmtpConfigured,
    firebaseAdminConfigured,
    ready: companySmtpConfigured && firebaseAdminConfigured,
    senderEmail: settings.smtpUser,
    senderFrom: settings.smtpFrom,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort
  };
}

export async function verifySmtpCredentials(): Promise<{
  ok: boolean;
  configured: boolean;
  verified: boolean;
  senderEmail: string;
  host: string;
  port: number;
  firebaseAdminConfigured: boolean;
  message: string;
}> {
  const { transporter, smtpUser, smtpPass, smtpHost, smtpPort } = createSmtpTransporter();
  const firebaseAdminConfigured = Boolean(getFirebaseAdminApp());

  if (!smtpUser || !smtpPass) {
    return {
      ok: false,
      configured: false,
      verified: false,
      senderEmail: smtpUser || DEFAULT_COMPANY_EMAIL,
      host: smtpHost,
      port: smtpPort,
      firebaseAdminConfigured,
      message:
        'SMTP_PASS is not set in environment variables. Configure a 16-character Google App Password for farmbridge2026@gmail.com in Secrets or .env.'
    };
  }

  try {
    await transporter.verify();
    return {
      ok: true,
      configured: true,
      verified: true,
      senderEmail: smtpUser,
      host: smtpHost,
      port: smtpPort,
      firebaseAdminConfigured,
      message: `SMTP credentials verified successfully for ${smtpUser} via ${smtpHost}:${smtpPort}.`
    };
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    const isAuthFailure =
      rawMsg.includes('535') ||
      rawMsg.toLowerCase().includes('username and password not accepted') ||
      rawMsg.toLowerCase().includes('invalid login');
    return {
      ok: false,
      configured: true,
      verified: false,
      senderEmail: smtpUser,
      host: smtpHost,
      port: smtpPort,
      firebaseAdminConfigured,
      message: isAuthFailure
        ? `Gmail rejected SMTP authentication for ${smtpUser}. Ensure 2-Step Verification is enabled and SMTP_PASS is a 16-character Google App Password.`
        : `SMTP verification failed: ${rawMsg}`
    };
  }
}

export async function sendCompanyVerificationEmail(params: {
  idToken: string;
  continueUrl?: string;
  newEmail?: string;
}): Promise<{
  sent: boolean;
  fallbackToFirebaseDefault: boolean;
  senderEmail: string;
  messageId?: string;
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

    const { transporter, smtpUser, smtpFrom } = createSmtpTransporter();
    await transporter.verify();

    const displayName = decoded.name || 'FarmBridge Member';
    const safeName = escapeHtml(displayName);
    const safeUrl = escapeHtml(verificationLink);

    const mailInfo = await transporter.sendMail({
      from: smtpFrom,
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
      senderEmail: smtpUser,
      messageId: mailInfo?.messageId
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
