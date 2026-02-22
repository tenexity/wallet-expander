import { Resend } from 'resend';
import { storage } from './storage';
import type { Task, TerritoryManager, Account } from '@shared/schema';
import { withRetry } from './utils/retry';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export interface EmailSettings {
  enabled: boolean;
  fromEmail: string;
  fromName: string;
  notifyOnNewTask: boolean;
  notifyOnHighPriority: boolean;
  dailyDigest: boolean;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: false,
  fromEmail: 'notifications@yourdomain.com',
  fromName: 'AI VP Dashboard',
  notifyOnNewTask: true,
  notifyOnHighPriority: true,
  dailyDigest: false,
};

export async function getEmailSettings(): Promise<EmailSettings> {
  const setting = await storage.getSetting('emailSettings');
  if (setting?.value) {
    try {
      return { ...DEFAULT_EMAIL_SETTINGS, ...JSON.parse(setting.value) };
    } catch {
      return DEFAULT_EMAIL_SETTINGS;
    }
  }
  return DEFAULT_EMAIL_SETTINGS;
}

export async function saveEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
  const current = await getEmailSettings();
  const updated = { ...current, ...settings };
  await storage.upsertSetting({ key: 'emailSettings', value: JSON.stringify(updated) });
  return updated;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<SendEmailResult> {
  const settings = await getEmailSettings();
  
  if (!settings.enabled) {
    return { success: false, error: 'Email notifications are disabled' };
  }

  const client = getResendClient();
  if (!client) {
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const result = await withRetry(
      () => client.emails.send({
        from: `${settings.fromName} <${settings.fromEmail}>`,
        to: [to],
        subject,
        html: htmlContent,
      }),
      { maxRetries: 3, timeoutMs: 30000 }
    );

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

export async function sendTestEmail(toEmail: string): Promise<SendEmailResult> {
  const settings = await getEmailSettings();
  const client = getResendClient();
  
  if (!client) {
    return { success: false, error: 'Resend API key not configured. Please add RESEND_API_KEY to your secrets.' };
  }

  try {
    const result = await withRetry(
      () => client.emails.send({
        from: `${settings.fromName} <${settings.fromEmail}>`,
        to: [toEmail],
        subject: 'Test Email from AI VP Dashboard',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Email Configuration Test</h2>
            <p>This is a test email from your AI VP Dashboard.</p>
            <p>If you received this email, your email notifications are configured correctly!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #718096; font-size: 12px;">This is an automated message from the AI VP Dashboard.</p>
          </div>
        `,
      }),
      { maxRetries: 3, timeoutMs: 30000 }
    );

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send test email' };
  }
}

export async function sendTaskNotification(
  task: Task,
  account: Account,
  territoryManager: TerritoryManager
): Promise<SendEmailResult> {
  const settings = await getEmailSettings();
  
  if (!settings.enabled || !settings.notifyOnNewTask) {
    return { success: false, error: 'Task notifications are disabled' };
  }

  const taskTypeLabels: Record<string, string> = {
    call: 'Phone Call',
    email: 'Email Outreach',
    visit: 'Site Visit',
  };

  const gapCategories = Array.isArray(task.gapCategories) 
    ? (task.gapCategories as string[]).join(', ') 
    : '';

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a365d;">New Task Assigned</h2>
      <p>Hi ${territoryManager.name},</p>
      <p>A new task has been assigned to you:</p>
      
      <div style="background: #f7fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; color: #2d3748;">${task.title}</h3>
        <p style="margin: 0 0 8px 0; color: #4a5568;"><strong>Account:</strong> ${account.name}</p>
        <p style="margin: 0 0 8px 0; color: #4a5568;"><strong>Type:</strong> ${taskTypeLabels[task.taskType] || task.taskType}</p>
        ${gapCategories ? `<p style="margin: 0 0 8px 0; color: #4a5568;"><strong>Categories:</strong> ${gapCategories}</p>` : ''}
        ${task.dueDate ? `<p style="margin: 0; color: #4a5568;"><strong>Due:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
      </div>
      
      ${task.description ? `<p style="color: #4a5568;">${task.description}</p>` : ''}
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #718096; font-size: 12px;">This is an automated notification from the AI VP Dashboard.</p>
    </div>
  `;

  return sendEmail(territoryManager.email, `New Task: ${task.title}`, htmlContent);
}

export async function sendHighPriorityNotification(
  task: Task,
  account: Account,
  territoryManager: TerritoryManager
): Promise<SendEmailResult> {
  const settings = await getEmailSettings();
  
  if (!settings.enabled || !settings.notifyOnHighPriority) {
    return { success: false, error: 'High priority notifications are disabled' };
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #feb2b2; color: #742a2a; padding: 12px; border-radius: 8px 8px 0 0;">
        <strong>HIGH PRIORITY</strong>
      </div>
      <div style="border: 1px solid #feb2b2; border-top: none; border-radius: 0 0 8px 8px; padding: 16px;">
        <h2 style="color: #1a365d; margin-top: 0;">Urgent Task Requires Attention</h2>
        <p>Hi ${territoryManager.name},</p>
        <p>A high-priority task requires your immediate attention:</p>
        
        <div style="background: #fff5f5; border-left: 4px solid #fc8181; padding: 12px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #c53030;">${task.title}</h3>
          <p style="margin: 0 0 4px 0;"><strong>Account:</strong> ${account.name}</p>
          ${task.dueDate ? `<p style="margin: 0;"><strong>Due:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
        </div>
        
        ${task.description ? `<p>${task.description}</p>` : ''}
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #718096; font-size: 12px;">This is an automated notification from the AI VP Dashboard.</p>
    </div>
  `;

  return sendEmail(
    territoryManager.email, 
    `[URGENT] ${task.title} - ${account.name}`, 
    htmlContent
  );
}
