
const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
const fs = require("fs")
const cors = require('cors');
app.use(cors());
app.use(express.json());




// const readParsedMailFile = () => {
//   try {
//       const rawData = fs.readFileSync('parsed_email.js');
//       return JSON.parse(rawData);
//   } catch (error) {
//       console.error('Error reading parsed_email.js file:', error);
//       return [];
//   }
// };

// =================================================================================
const imaps = require('imap-simple');
//used IMAP for email mapping

// IMAP configuration
const imapConfig = {
    imap: {
        user: 'sourabhpatel073@gmail.com', // Your email address
        password: 'bmop gqlt sovq einw', // Your email password
        host: 'imap.gmail.com', // IMAP server hostname
        port: 993, // IMAP server port (993 for SSL)
        tls: true,
        tlsOptions: {
            rejectUnauthorized: false, // Or true if you don't want to reject self-signed certificates
        },
        authTimeout: 300000 // Set authentication timeout (ms)
    },
    debug:console.log

};


// Write parsed email data to a file
const filename = 'parsed_email.json';


// Function to fetch and process emails
async function fetchEmails() {
    try {
        // Connect to the IMAP server
        const connection = await imaps.connect(imapConfig);

        // Open the INBOX mailbox
        await connection.openBox('INBOX');

        // Search for unseen emails
        const searchCriteria = [ 'UNSEEN', ['SINCE', 'April 13, 2025']];
        // const searchCriteria = ['ALL'];
        const fetchOptions = { bodies: ['TEXT'],envelope:true,struct:true };
        const messages = await connection.search(searchCriteria, fetchOptions);
           console.log(messages.length,"messages")
        // Process each email
        for (let message of messages) {
            // console.log('rawObj --'+JSON.stringify(message))
            let envelope = message.attributes.envelope;
            let date = envelope.date;
            let subject = envelope.subject;
            let sender = envelope.from[0];
            let id = envelope.messageId;
            // message.id= id
            let toList = envelope.to.map(recipient => recipient.mailbox + "@" + recipient.host);
            let ccList = envelope.length ? envelope.cc.map(recipient => recipient.mailbox + "@" + recipient.host):'';
            let bccList = envelope.bcc ? envelope.bcc.map(recipient => recipient.mailbox + "@" + recipient.host) : [];
            let attach = [];

            let parts = imaps.getParts(message.attributes.struct);
            let body = ''
            for (let part of parts) {
                body = await connection.getPartData(message, part);
            }
            var emailObj = {
                id:id,
                sender:sender.mailbox +"@"+ sender.host,   
                date:date,
                toArr:toList,
                ccArr:ccList,
                bccArr:bccList,
                subject:subject,
                body:body,
                attachment:attach
              }
              return messages
            // console.log(JSON.stringify(emailObj)+'\n')
                // try {   
                //     await fs.appendFileSync(filename, JSON.stringify(emailObj)+',\n', { encoding: 'utf-8' });

                // } catch (error) {
                //     console.error('Error writing emails to file:', error);
                // }
            // console.log('sender '+sender.mailbox +"@"+ sender.host)
            // console.log('DATE '+date)
            // console.log('TO '+toList)
            // console.log('CC '+ccList)
            // console.log('BCC '+bccList)
            // console.log('subject '+subject)
            // console.log('BODY '+body)
            // console.log('ATT '+attachments)
        }

        // Close the connection
        await connection.end();



    } catch (error) {
        console.error('Error fetching emails:', error);
    }
}




// ====================================================================================
app.get('/pagenum',async(req,res)=>{
  
  const page = parseInt(req.query.page) || 1; // Current page number, default is 1
    const itemsPerPage = 6;
    
    // Read data from the file
    // const allData = readParsedMailFile();
    const allData = await fetchEmails()||[];
    console.log('alldata',allData)
    // Calculate start and end index for the current page
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = page * itemsPerPage;

    // Extract data for the current page
    const paginatedData = await allData.slice(startIndex, endIndex)||[];

    res.json({
        page: page,
        totalPages: Math.ceil(allData.length / itemsPerPage),
        data: paginatedData
    });

})



app.get('/emails/:id',async (req, res) => {
  const emailId = req.params.id;
  let emails = await fetchEmails();
  console.log(emails,emailId)
  const email = emails.find(email => email.attributes.envelope.messageId == emailId);
  if (email) {
    res.json(email);
  } else {
    res.status(404).json({ error: 'Email not found' });
  }
});


// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, // SMTP port for TLS (587) or SSL (465)
  secure: false, // Use TLS (true for 465, false for other ports)
  auth: {
    user: "sourabhpatel073@gmail.com",
    pass: "bmop gqlt sovq einw",
  },
});

app.post('/send-email', (req, res) => {
  // Email content
  
  const { sender, recipient, subject, body } = req.body;

  const mailOptions = {
    from: sender||'sourabhpatel073@gmail.com', // Sender address
    to: recipient||'sourabhwebdev67@gmail.com', // List of recipients
    subject:subject||'Test Email', // Subject line
    text: body||'This is a test email sent from Nodemailer.', // Plain text body
    // html: '<p>This is a test email sent from Nodemailer.</p>' // HTML body
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error:', error);
      res.status(500).send('Error sending email');
    } else {
      console.log('Email sent:', info.response);
      res.status(200).send('Email sent successfully');
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



