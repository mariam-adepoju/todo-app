const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;
const getTransporter = () => {
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT) || 587;
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
    }
    return transporter;
};

// Uses Resend's HTTP API when RESEND_API_KEY is set (works on hosts that block SMTP),
// otherwise falls back to SMTP via nodemailer.
const sendMail = async ({ to, subject, text }) => {
    if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text })
        });
        if (!response.ok) {
            throw new Error(`Resend responded with status ${response.status}`);
        }
        return;
    }

    if (!process.env.SMTP_HOST) {
        logger.warn('No mail provider configured, skipping email');
        return;
    }

    await getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject, text });
};

const sendOverdueEmail = async (to, todo) => {
    try {
        await sendMail({
            to,
            subject: `Task overdue: ${todo.title}`,
            text:
                `Hi,\n\nYour task "${todo.title}" was due on ${todo.dueDate.toUTCString()} ` +
                `and is now overdue.\n\nLog in to your Todo App to complete it.`
        });
        logger.info(`Overdue email sent to ${to} for task ${todo._id}`);
    } catch (err) {
        // Never let an email failure break the overdue job
        logger.error(`Overdue email failed for task ${todo._id}: ${err.message}`);
    }
};

module.exports = { sendOverdueEmail };
