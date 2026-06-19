const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client;
let isReady = false;

const initWhatsApp = () => {
    console.log('\x1b[36m%s\x1b[0m', 'Initializing WhatsApp Service...');
    
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-extensions'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('\n\x1b[33m%s\x1b[0m', '-----------------------------------------');
        console.log('\x1b[33m%s\x1b[0m', '📲 SCAN THIS QR CODE FOR WHATSAPP:');
        console.log('\x1b[33m%s\x1b[0m', '-----------------------------------------');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        isReady = true;
        console.log('\x1b[32m%s\x1b[0m', '✅ WhatsApp Client is ready and connected!');
    });

    client.on('authenticated', () => {
        console.log('\x1b[32m%s\x1b[0m', '✅ WhatsApp Authenticated successfully.');
    });

    client.on('auth_failure', msg => {
        isReady = false;
        console.error('\x1b[31m%s\x1b[0m', '❌ WhatsApp Auth failure:', msg);
    });

    client.on('disconnected', (reason) => {
        isReady = false;
        console.warn('\x1b[33m%s\x1b[0m', '⚠️ WhatsApp was disconnected:', reason);
    });

    try {
        client.initialize().catch(err => {
            console.error('\x1b[31m%s\x1b[0m', '❌ WhatsApp initialization failed.');
            console.error('Error Details:', err.message);
        });
    } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Critical WhatsApp Error:', err);
    }
};

const getClient = () => client;
const getWhatsAppStatus = () => isReady;

/**
 * Low-level send with optional retry.
 * @param {string} number - Phone number with country code (e.g. +91XXXXXXXXXX)
 * @param {string} message - Plain text or WhatsApp-formatted message
 * @param {number} retries - How many times to retry on failure (default: 2)
 */
const sendWhatsAppMessage = async (number, message, retries = 2) => {
    if (!client || !isReady) {
        console.warn('\x1b[33m%s\x1b[0m', `⚠️ Cannot send message to ${number}: WhatsApp client not ready.`);
        return false;
    }

    const formattedNumber = number.replace(/[^0-9]/g, '') + '@c.us';

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            await client.sendMessage(formattedNumber, message);
            console.log('\x1b[32m%s\x1b[0m', `📧 WhatsApp message sent to ${number}`);
            return true;
        } catch (err) {
            console.error('\x1b[31m%s\x1b[0m', `❌ Attempt ${attempt} failed for ${number}:`, err.message);
            if (attempt <= retries) {
                // Exponential back-off: 1s, 2s, …
                await new Promise(r => setTimeout(r, attempt * 1000));
            }
        }
    }
    return false;
};

/**
 * Builds and sends a structured incident-alert WhatsApp message.
 * @param {string} parentContact - WhatsApp number of the parent/guardian
 * @param {Object} incident - Incident object stored in the database
 */
const sendIncidentAlert = async (parentContact, incident) => {
    if (!parentContact) {
        console.warn('\x1b[33m%s\x1b[0m', '⚠️ sendIncidentAlert: No parent contact provided, skipping.');
        return false;
    }

    const severityEmoji = {
        low:      '🟡',
        medium:   '🟠',
        high:     '🔴',
        critical: '🚨'
    }[incident.severity?.toLowerCase()] || '⚪';

    const dateStr = incident.date
        ? new Date(incident.date).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true
          })
        : 'N/A';

    const message =
`🏫 *SCHOOL INCIDENT ALERT*
━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian,

An incident involving your ward has been officially recorded.

👤 *Student:* ${incident.studentName || 'N/A'} (ID: ${incident.studentId || 'N/A'})
🎓 *Grade:* ${incident.grade || 'N/A'}
📋 *Type:* ${incident.type || 'N/A'}
📍 *Location:* ${incident.location || 'N/A'}
📅 *Date & Time:* ${dateStr}
${severityEmoji} *Severity:* ${(incident.severity || 'low').toUpperCase()}
👩‍💼 *Reported By:* ${incident.reportedBy || 'School Staff'}

📝 *Incident Description:*
${incident.description || 'No additional details provided.'}

━━━━━━━━━━━━━━━━━━━━
⚠️ Please contact the school administration at your earliest convenience for further information and follow-up.

_This is an automated notification from the Student Behavior Management System._`;

    console.log('\x1b[36m%s\x1b[0m', `📲 Sending incident alert to ${parentContact}...`);
    const sent = await sendWhatsAppMessage(parentContact, message);
    if (sent) {
        console.log('\x1b[32m%s\x1b[0m', `✅ Incident alert delivered to ${parentContact}`);
    } else {
        console.error('\x1b[31m%s\x1b[0m', `❌ Failed to deliver incident alert to ${parentContact}`);
    }
    return sent;
};

module.exports = { initWhatsApp, sendWhatsAppMessage, sendIncidentAlert, getClient, getWhatsAppStatus };
