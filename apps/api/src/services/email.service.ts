
import { log } from "@hermes/logger";

/**
 * Email Service
 * Handles sending of transactional emails (password reset, verification, etc.)
 * Currently a stub implementation
 */
export const emailService = {
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, resetLink: string): Promise<void> {
    // In a real implementation, this would use a provider like SendGrid, SES, etc.
    log.info(`[EmailService] Sending password reset email to ${email}`, {
      token,
      resetLink,
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`
      ========================================
      PASSWORD RESET EMAIL
      To: ${email}
      Link: ${resetLink}
      ========================================
      `);
    }
  },

  /**
   * Send email verification email
   */
  async sendVerificationEmail(email: string, token: string, verificationLink: string): Promise<void> {
    log.info(`[EmailService] Sending verification email to ${email}`, {
      token,
      verificationLink,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`
      ========================================
      VERIFICATION EMAIL
      To: ${email}
      Link: ${verificationLink}
      ========================================
      `);
    }
  },
  
  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    log.info(`[EmailService] Sending welcome email to ${email}`);
  }
};
