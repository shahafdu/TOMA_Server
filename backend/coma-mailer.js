var icalToolkit = require('ical-toolkit')
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var smtpOptions = {
  host: '<PLACEHOLDER_SMTP_HOST>',
  port: <PLACEHOLDER_SMTP_PORT>,
  secureConnection: false,
  // auth: {
  //    user: '<PLACEHOLDER_SMTP_USER>',
  //    pass: '<PLACEHOLDER_SMTP_PASS>'
  // }
};

var transporter = nodemailer.createTransport(smtpTransport(smtpOptions));

sendMailWrapper = function (fromFullName, fromEmail, toEmailArray,ccEmail, subject, htmlContent, callback) { 

  var mailOptionsOrg = {
    from: fromFullName + '<' + fromEmail + '>',
    to: toEmailArray.toString(),
    cc: ccEmail,
    //replyTo: fromEmail,
    subject: subject,
    html: htmlContent
  };

  transporter.sendMail(mailOptionsOrg, function (err, info) {
    if (err) {
      callback(err)
    } else {
      return
    };      
  });
}


sendInvites = function (fromUser, fromFullName, fromEmail, courseName, locAndDates, userList, callback) {
  const suffixInd = courseName.match(/#\d+$/).index;
  courseName = courseName.slice(0, suffixInd);

  // Create a builder
  var builder = icalToolkit.createIcsFileBuilder()

  /*
   * Settings (All Default values shown below. It is optional to specify)
   * */
  builder.spacers = true // Add space in ICS file, better human reading. Default: true
  builder.NEWLINE_CHAR = '\r\n' // Newline char to use.
  builder.throwError = true // If true throws errors, else returns error when you do .toString() to generate the file contents.
  builder.ignoreTZIDMismatch = true // If TZID is invalid, ignore or not to ignore!

  /**
   * Build ICS
   * */

  // Name of calendar 'X-WR-CALNAME' tag.
  builder.calname = null //'Calendar'

  // Cal timezone 'X-WR-TIMEZONE' tag. Optional. We recommend it to be same as tzid.
  //builder.timezone = 'israel/tel_aviv'

  // Time Zone ID. This will automatically add VTIMEZONE info.
  //builder.tzid = 'israel/tel_aviv'

  // Method
  builder.method = 'PUBLISH'

  var attendeesArray = [];
  userList.forEach(user => {
    attendeesArray.push({
        name: user.firstName + ' ' +  user.lastName, // Required
        email: user.email, // Required     
        rsvp: true, // Optional, adds 'RSVP=TRUE' , tells the application that organizer needs a RSVP response.
        role: 'OPT-PARTICIPANT', // Optional
    })
  })
 
  let mailsSent = 0;
  locAndDates.forEach(date => {
    builder.events.pop();
    
    // Add events
    builder.events.push({

      // Event start time, Required: type Date()
      start: new Date(date.DateTimeStart),

      // Event end time, Required: type Date()
      end: new Date(date.DateTimeEnd),

      // transp. Will add TRANSP:OPAQUE to block calendar.
      transp: 'OPAQUE',

      // Event summary, Required: type String
      summary: 'Course: ' + courseName,

      // All Optionals Below

      // Alarms, array in minutes
      alarms: [15],

      // Optional: If you need to add some of your own tags
      // additionalTags: {
      //   'SOMETAG': 'SOME VALUE'
      // },

      // Event identifier, Optional, default auto generated
      uid: null,

      // Optional, The sequence number in update, Default: 0
      sequence: null,

      // Location of event, optional.
      location: date.Location,

      // Optional description of event.
      description: 'Testing it!',

      // Optional Organizer info
      organizer: {
        name: fromFullName,
        email: fromEmail
      },

      attendees: attendeesArray,
      // Optional attendees info
      
    })

    // // Optional tags on VCALENDAR level if you intent to add. Optional field
    // builder.additionalTags = {
    //   'SOMETAG': 'SOME VALUE'
    // }
    
    // Try to build
    var icsFileContent = builder.toString();

    // Check if there was an error (Only required if yu configured to return error, else error will be thrown.)
    if (icsFileContent instanceof Error) {
      callback(icsFileContent);
      return;
    }
    var htmlContent = (date.TextForMail && date.TextForMail.length > 0) ? date.TextForMail : 'Lecturer: ' + date.Lecturer + '<br>' + 'Syllabus: ' + date.Syllabus;

    

    var mailOptionsOrg = {
      from: fromEmail,
      to: fromEmail,
      replyTo: fromEmail,
      subject: 'Course: ' + courseName,
      html: htmlContent,
      alternatives: [{
        contentType: 'text/calendar; charset="utf-8"; method=PUBLISH',
        content: icsFileContent
      }]
    }

    mailsSent++;
    transporter.sendMail(mailOptionsOrg, function (err, info) {
      if (err) {
        callback(err)
      } else {
        mailsSent--;
        if (mailsSent === 0)  {
          return
        };
      };      
    })

  }); 
}

module.exports.sendInvites = sendInvites;
module.exports.sendMailWrapper = sendMailWrapper;