var pool = require('./connect-server').pool
var moment = require('moment');
var comaMailer = require('./coma-mailer');
var exceptionsList = require('./coma-config').exceptionsList
var hrCharge = require('./coma-config').hrCharge

sendReviewOnCourse = function () {
    var date = new Date();
    date.setDate(date.getDate() - 1); // Set now + 30 days as the new date
    let targetDate = moment(date).format('YYYY-MM-DD')
  
    const query = `SELECT t1.CourseID
        FROM coma.coursetodatetime t1
        WHERE t1.DateTimeEnd = (
            SELECT MAX(t2.DateTimeEnd)
            FROM coma.coursetodatetime t2
            WHERE t2.CourseID = t1.CourseID
        ) and t1.DateTimeEnd like "%${targetDate}%"`
    pool.query(query, function (error, courses) {
        if (error) {
            console.log(`(${date}) [sendReviewOnCourse] ERROR: ${error}`);
            pool.end();
            return
        }
        if (courses.length === 0) {
            return
        }
        const course_ids = courses.map(c => c.CourseID)
        const query = `SELECT C.CourseID , U.email, C.CourseName
            FROM coma.courses C
            LEFT JOIN coma.coursetouser CU ON C.courseID = CU.courseID
            LEFT JOIN emma.users U ON U.sircID = CU.ID
            WHERE C.CourseID IN (${course_ids.join(', ')})`
        pool.query(query, function (error, results) {
            if (error) {
                console.log(`(${date}) [sendReviewOnCourse] ERROR: ${error}`);
                pool.end();
                return
            }
            let courseData = {}
            for (let i = 0; i < course_ids.length; i++) {
                courseData[course_ids[i]] = {}
                let mailList = new Set();
                for (let j = 0; j < results.length; j++) {
                    if (results[j].CourseID == course_ids[i]) {
                        mailList.add(results[j].email);
                        //update only for the first record:
                        if (mailList.size == 1) {
                            courseData[course_ids[i]].CourseName = results[j].CourseName
                        }
                    }
                }
                courseData[course_ids[i]].mailList = mailList;
                if (courseData[course_ids[i]].mailList.size > 0) {
                    sendMail(courseData[course_ids[i]])
                }
            }
            pool.end();
        });
    });
}



sendMail = function (courseDate) {
    for (let i = 0; i < exceptionsList.length; i++) {
        courseDate.mailList.delete(exceptionsList[i])
    }

    if (courseDate.CourseName.indexOf('#') != -1) {
        courseDate.CourseName = courseDate.CourseName.split('#')[0]
    }
    let subject = 'Course: ' + courseDate.CourseName
    let htmlContent = 'Hi all, <br><br>' +
        'I will be happy to get your feedback on the course,<br><br>' +
        'Thanks';

    comaMailer.sendMailWrapper(hrCharge.name, hrCharge.mail,  courseDate.mailList, '', subject, htmlContent, function (err) {
        if (err) {
            console.log('falied to send, error: ', err)
            return;
        }
        return;
    });


}


sendReviewOnCourse();