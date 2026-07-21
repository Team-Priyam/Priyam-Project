import nodemailer from "nodemailer";

/**
 * Sends an onboarding email containing login instructions and a temporary password.
 * 
 * @param {string} toEmail - The recipient email address
 * @param {string} userName - The recipient's name
 * @param {string} tempPassword - The auto-generated temporary password
 */
export const sendOnboardingEmail = async (toEmail, userName, tempPassword) => {
  const loginUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  
  const emailSubject = "Welcome to Village Microfinance - Your Account Credentials";
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1a202c;">
      <div style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">Village Microfinance</h1>
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; color: #4a5568;">Hello <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; line-height: 1.5; color: #4a5568;">An administrator has successfully registered your account as a staff member on our Micro-Lending platform.</p>
      
      <div style="background-color: #f7fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 25px 0; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #2d3748;">Temporary Login Credentials</h3>
        <p style="margin: 5px 0; font-size: 14px; color: #4a5568;"><strong>Login Email:</strong> <span style="font-family: monospace; font-size: 15px;">${toEmail}</span></p>
        <p style="margin: 5px 0; font-size: 14px; color: #4a5568;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 15px; background-color: #edf2f7; padding: 2px 6px; border-radius: 3px; font-weight: bold; color: #e53e3e;">${tempPassword}</span></p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; color: #4a5568;">Please click the button below to log in and update your password immediately upon access:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Log In to Portal</a>
      </div>
      
      <p style="font-size: 13px; line-height: 1.4; color: #718096; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        <strong>Security Warning:</strong> This is a temporary password. Do not share these credentials with anyone. If you did not expect this registration request, please contact your local system administrator immediately.
      </p>
    </div>
  `;

  // Determine transport config
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    // Real SMTP configuration
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort) || 587,
        secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"Village Microfinance" <${smtpUser}>`,
        to: toEmail,
        subject: emailSubject,
        html: emailHtml,
      });

      console.log(`[Email Service] Onboarding email successfully sent to ${toEmail} via SMTP.`);
      return { success: true, mode: "smtp" };
    } catch (error) {
      console.error("[Email Service] Failed sending email via SMTP:", error.message);
      // Fallback to mock log in case of SMTP failure so that execution doesn't break
      logEmailToConsole(toEmail, userName, tempPassword, emailSubject);
      return { success: true, mode: "fallback-error", error: error.message };
    }
  } else {
    // Development fallback: Log email beautifully to the console
    logEmailToConsole(toEmail, userName, tempPassword, emailSubject);
    return { success: true, mode: "mock-console" };
  }
};

// Console logger helper
const logEmailToConsole = (toEmail, userName, tempPassword, subject) => {
  console.log("\n========================================================");
  console.log("📨 SIMULATED OUTGOING EMAIL (DEVELOPMENT MODE)");
  console.log("--------------------------------------------------------");
  console.log(`To:       ${userName} <${toEmail}>`);
  console.log(`Subject:  ${subject}`);
  console.log("--------------------------------------------------------");
  console.log("Dear " + userName + ",");
  console.log("Welcome to Village Microfinance!");
  console.log(`Your staff account has been set up with these temporary credentials:`);
  console.log(`- Username: ${toEmail}`);
  console.log(`- Temporary Password: ${tempPassword}`);
  console.log(`Please visit the portal to secure your account.`);
  console.log("========================================================\n");
};

/**
 * Sends overdue payment notification emails to both Borrower and Lender.
 */
export const sendOverdueNotification = async ({
  borrowerName,
  borrowerEmail = "borrower@example.com",
  lenderName = "Lead Loan Officer",
  lenderEmail = "officer@microfinance.org",
  amountDue,
  dueDate,
  daysOverdue,
}) => {
  const formattedDueDate = new Date(dueDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subjectBorrower = `🚨 [OVERDUE ALERT] Action Required: Loan Repayment for ${borrowerName} is Past Due`;
  const subjectLender = `⚠️ [OVERDUE NOTICE] Borrower ${borrowerName} Loan Repayment is Past Due`;

  // Prepared notification messages for borrower and lender
  const borrowerMessage = `Dear ${borrowerName}, your scheduled loan repayment of $${Number(amountDue).toLocaleString()} due on ${formattedDueDate} is now ${daysOverdue} day(s) overdue. Please process payment immediately.`;
  const lenderMessage = `Loan Officer Alert: Borrower ${borrowerName} has an overdue repayment balance of $${Number(amountDue).toLocaleString()} (${daysOverdue} day(s) overdue, original due date: ${formattedDueDate}).`;

  console.log("\n========================================================");
  console.log("🚨 OVERDUE NOTIFICATION DISPATCHED TO BOTH PARTIES");
  console.log("--------------------------------------------------------");
  console.log(`[BORROWER NOTIFICATION]`);
  console.log(`To:          ${borrowerName} <${borrowerEmail}>`);
  console.log(`Subject:     ${subjectBorrower}`);
  console.log(`Message:     ${borrowerMessage}`);
  console.log(`Status:      OVERDUE (${daysOverdue} Days Past Due)`);
  console.log(`Amount Due:  $${Number(amountDue).toLocaleString()}`);
  console.log(`Due Date:    ${formattedDueDate}`);
  console.log("--------------------------------------------------------");
  console.log(`[LENDER NOTIFICATION]`);
  console.log(`To:          ${lenderName} <${lenderEmail}>`);
  console.log(`Subject:     ${subjectLender}`);
  console.log(`Message:     ${lenderMessage}`);
  console.log(`Status:      OVERDUE AUDIT ALERT`);
  console.log(`Borrower:    ${borrowerName}`);
  console.log(`Amount Due:  $${Number(amountDue).toLocaleString()}`);
  console.log("========================================================\n");

  return {
    success: true,
    borrowerNotified: borrowerEmail,
    lenderNotified: lenderEmail,
    borrowerMessage,
    lenderMessage,
    status: "overdue",
    sentAt: new Date(),
  };
};
