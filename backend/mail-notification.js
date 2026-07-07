var pool = require('./connect-server').pool
var moment = require('moment');
var comaMailer = require('./coma-mailer');
var exceptionsList = require('./coma-config').exceptionsList
var hrCharge = require('./coma-config').hrCharge

sendMailNotification = function () {
    var date = new Date();
    date.setDate(date.getDate() + 30);
    let targetDate = moment(date).format('YYYY-MM-DD')
    var targetMonth = date.toLocaleString('default', { month: 'long' });
  
    pool.query('SELECT t1.CourseID ' +
        'FROM coma.coursetodatetime t1 ' +
        'WHERE t1.DateTimeStart = (SELECT MIN(t2.DateTimeStart) ' +
        'FROM coma.coursetodatetime t2 ' +
        'WHERE t2.CourseID = t1.CourseID) and  t1.DateTimeStart like "%' + targetDate + '%"',
        function (error, results) {
            if (error) {
                console.log('sendMailNotification failed on:', moment().format('DD/MM/YYYY HH:mm:ss'), error);
            }
            else {
                if (results.length > 0) {
                    let courseIDs = '';
                    let courseIDsList = [];
                    for (let i = 0; i < results.length; i++) {
                        courseIDs += results[i].CourseID;
                        courseIDs += ',';
                        courseIDsList.push(results[i].CourseID)
                    }
                    courseIDs = courseIDs.slice(0, -1)
                    const query = `SELECT
                            C.CourseID,
                            U.firstName,
                            U.lastName,
                            DM.FullName AS managerName,
                            DM.email
                        FROM coma.courses C
                        LEFT JOIN coma.coursetouser CU ON C.courseID = CU.courseID
                        LEFT JOIN emma.users U ON U.sircID = CU.ID
                        LEFT JOIN emma.users managers ON U.managerSircID = DM.ID
                        WHERE
                            C.TotalHours > 3
                            AND CO.CourseID ON (${courseIDs})`
                    pool.query(query, function (error, results) {
                            if (error) {
                                console.log('sendMailNotification failed on:', moment().format('DD/MM/YYYY HH:mm:ss'), error);
                                pool.end();
                                return
                            }
                            let courseData = {}
                            for (let i = 0; i < courseIDsList.length; i++) {
                                courseData[courseIDsList[i]] = {}
                                let mailList = new Set();;
                                let members = []
                                for (let j = 0; j < results.length; j++) {
                                    if (results[j].CourseID == courseIDsList[i]) {
                                        mailList.add(results[j].email);
                                        members.push(results[j].firstName + ' ' + results[j].lastName + ',' + results[j].managerName)
                                    }
                                }
                                courseData[courseIDsList[i]].mailList = mailList;
                                courseData[courseIDsList[i]].members = members;
                            }

                            //calcluate all the interval per course
                            pool.query('SELECT CourseID, DateTimeStart,DateTimeEnd ' +
                                'FROM coma.coursetodatetime  where CourseID in (' + courseIDs + ') order by CourseID,DateTimeStart',
                                function (error, results) {
                                    if (error) {
                                        console.log('sendMailNotification failed on:', moment().format('DD/MM/YYYY HH:mm:ss'), error);
                                        pool.end();
                                    }
                                    else {


                                        for (let i = 0; i < courseIDsList.length; i++) {

                                            intervalTime = []
                                            for (let j = 0; j < results.length; j++) {
                                                if (results[j].CourseID == courseIDsList[i]) {
                                                    intervalTime.push(moment(results[j].DateTimeStart).add(3, 'hours').format('DD/MM HH:mm') + '-' + moment(results[j].DateTimeEnd).add(3, 'hours').format('HH:mm'));
                                                }

                                            }
                                            courseData[courseIDsList[i]].times = intervalTime;
                                        }
                                        pool.query('SELECT CourseID, CourseName, Lecturer, Syllabus ' +
                                            'FROM coma.courses where CourseID in (' + courseIDs + ') ',
                                            function (error, results) {
                                                if (error) {
                                                    console.log('sendMailNotification failed on:', moment().format('DD/MM/YYYY HH:mm:ss'), error);
                                                    pool.end();
                                                } else {
                                                    for (let i = 0; i < results.length; i++) {
                                                        courseData[results[i].CourseID].CourseName = results[i].CourseName;
                                                        courseData[results[i].CourseID].Lecturer = results[i].Lecturer;
                                                        courseData[results[i].CourseID].Syllabus = results[i].Syllabus;
                                                        if (courseData[results[i].CourseID].members.length>0){
                                                            sendMail(courseData[results[i].CourseID], targetMonth)
                                                        }
                                                        


                                                    }

                                                }
                                                pool.end();
                                            });
                                    }

                                });
                        });
                }else{
                    pool.end();
                }
            };
        });
}

sendMail = function (courseDate, month) {
  
    for (let i = 0; i < exceptionsList.length; i++) {
        courseDate.mailList.delete(exceptionsList[i])
    }
    let courseDates = ''
    for (let i = 0; i < courseDate.times.length; i++) {
        courseDates += courseDate.times[i] + '<br>'
    }
    let participantList = '';
    for (let i = 0; i < courseDate.members.length; i++) {
        elem = courseDate.members[i].split(',')
        participantList += '<tr>' +
            '<td>' + elem[0] + '&nbsp;</td>' +
            '<td>' + elem[1] + '&nbsp;</td>' +
            '</tr>'
    }
    if (courseDate.CourseName.indexOf('#') != -1) {
        courseDate.CourseName = courseDate.CourseName.split('#')[0]
    }
    let title = '(' + courseDate.CourseName.trim() +') - managers notification'
    let htmlContent = 'Hi all,<br> ' +
        'FYI <br>' +
        'We will have ' + courseDate.CourseName + 'course during ' + month + ', led by ' + courseDate.Lecturer + '<br>' +
        'in the following dates:<br>' +
        courseDates +
        'You have employee/s you registered to this course, please See below participants list and content.<br>' +
        'You are welcome to contact me if you have any questions. <br><br>' +
        '<table width="30%" border="1">' +
        '<tr style="background-color:orange">' +

        '<td>&nbsp;Participant</td>' +
        '<td>&nbsp;Participant Manager</td>' +
        '</tr>' +
        participantList +
        '</table> <br>' +
        'Syllabus: <br>' +
        courseDate.Syllabus
        ;

    comaMailer.sendMailWrapper(hrCharge.name, hrCharge.mail, courseDate.mailList ,hrCharge.mail, title, htmlContent, function (err) {
        if (err) {
            console.log('falied to send')
            return;
        }
        return;
    });


}

sendMailNotification();



