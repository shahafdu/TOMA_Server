var express = require('express');
var moment = require('moment');
var bodyParser = require('body-parser')
var CryptoJS = require("crypto-js");
var ldap = require('ldapjs');


var common = require('./common');
var comaMailer = require('./coma-mailer');
var { pool } = require('./connect-server.js');


var app = express();
app.use(bodyParser.json({
    limit: '10mb',
    extended: true,
}));
app.use(bodyParser.urlencoded({
    limit: '10mb',
    extended: true,
}));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
});
app.use(function (req, res, next) {
    const reqTimeout = setTimeout(() => {
        console.log(req.originalUrl);
        res.status(444).send('Request timed-out. Please try again in a few seconds.')
        process.exit()
    }, 30000);
    req.on("close", () => {
        clearTimeout(reqTimeout);
    })
    next();
});

function url2Name(url) {
    let name = url.replace(/_/g, ' ');
    name = name.replace(/&\d+$/, (str) => str.replace('&', '#'));
    return name;
}

app.get('/', function (req, res) {
    res.send('COMA Server');
});

app.get('/getYearlyBudget/:year', function (req, res) {
    const { year } = req.params;
    query = `SELECT yearlyBudget${year} as yearlyBudget FROM coma.budget;`;
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results[0]);
        }
        return res;
    });
});

app.get('/getYearlyTargetHours/:year', function (req, res) {
    const { year } = req.params;
    const query = `SELECT yearlyTargetHours${year} as yearlyTargetHours FROM coma.hours;`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results[0]);
        }
        return res;
    });
});

app.get('/getUserDetails/:ID/:year', function (req, res) {
    const { ID, year } = req.params;
    const query = 'SELECT ' +
        'u.sircID, u.firstName, u.lastName, u.email, u.imageUrl, u.userName, u.category, u.status, u.startDate, u.startDate, u.endDate, u.endDate2, ' +
        'u.managerSircID, managers.firstName as managerFirstName, managers.lastName as managerLastName, ' +
        'u.authorizationIdCOMA, ' +
        `coma_users.EducationHours${year} as EducationHours, ` +
        'courses.CourseName ' +
        'FROM emma.users u ' +
        'LEFT JOIN emma.users managers ON u.managerSircID = managers.sircID ' +
        'LEFT JOIN coma.users coma_users ON u.sircID = coma_users.ID ' +
        'LEFT JOIN coma.coursetouser cu ON u.sircID = cu.ID ' +
        'LEFT JOIN coma.courses courses ON cu.CourseID = courses.CourseID ' +
        `WHERE u.sircID = "${ID}"`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getUserByUserNameDetails/:userName/:year', function (req, res) {
    const { userName, year } = req.params;
    const query = 'SELECT ' +
        'u.sircID, u.firstName, u.lastName, u.email, u.imageUrl, u.userName, u.category, u.status, u.startDate, u.startDate2, u.endDate, u.endDate2, ' +
        'u.managerSircID, managers.firstName as managerFirstName, managers.lastName as managerLastName, ' +
        'u.authorizationIdCOMA, ' +
        `coma_users.EducationHours${year} as EducationHours, ` +
        'courses.CourseName ' +
        'FROM emma.users u ' +
        'LEFT JOIN emma.users managers ON u.managerSircID = managers.sircID ' +
        'LEFT JOIN coma.users coma_users ON u.sircID = coma_users.ID ' +
        'LEFT JOIN coma.coursetouser cu ON u.sircID = cu.ID ' +
        'LEFT JOIN coma.courses courses ON cu.CourseID = courses.CourseID ' +
        `WHERE u.userName = "${userName}";`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getAllUsers/:year', function (req, res) {
    const year = req.params.year;
    const query = 'SELECT ' +
        'u.sircID, u.firstName, u.lastName, u.email, u.imageUrl, u.userName, u.category, u.status, u.startDate, u.startDate2, u.endDate, u.endDate2, ' +
        'u.managerSircID, managers.firstName as managerFirstName, managers.lastName as managerLastName, ' +
        'u.authorizationIdCOMA, ' +
        `coma_users.EducationHours${year} as EducationHours ` +
        'FROM emma.users u ' +
        'LEFT JOIN emma.users managers ON u.managerSircID = managers.sircID ' +
        'LEFT JOIN coma.users coma_users ON u.sircID = coma_users.ID ' +
        'WHERE u.Status = "working";'
    pool.query(query, function (error, results, fields) {
        if (error) { res.status(500).send({ error }); return res };
        res.json(results);
        return res;
    });
});

app.get('/getAllUserCourses/:ID/:year', function (req, res) {
    const { ID } = req.params;
    const query = 'SELECT ' +
        'c.CourseName, ' +
        // FIXME: the year should be a property of the course not extracted from the name
        'right(c.CourseName, 4) as CourseYear ' +
        'FROM coma.courses c ' +
        'LEFT JOIN coma.coursetouser cu ON c.CourseID = cu.CourseID ' +
        `WHERE cu.ID = ${ID};`
    pool.query(query,
        function (error, results, fields) {
            if (error) res.status(500).send({ error });
            else {
                res.json(results);
            }
            return res;
        });
});

app.get('/getManagerDirectEmployees/:managerID/:year', function (req, res) {
    const { year, managerID } = req.params;
    const query = 'SELECT ' +
        'u.sircID, u.firstName, u.lastName, u.category, ' +
        `coma_users.EducationHours${year} as EducationHours ` +
        'FROM emma.users u ' +
        'LEFT JOIN coma.users coma_users ON u.sircID = coma_users.ID ' +
        `WHERE u.managerSircID = "${managerID}" and u.Status = "working"`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getEmployeesCourses/:managerID/:targetYear/:year', function (req, res) {
    const { managerID, targetYear } = req.params;
    const query = `CALL coma.spr_getAllemployeesCoursesWithHouersByManagerID(${managerID}, ${targetYear})`
    pool.query(query,
        function (error, results, fields) {
            if (error) res.status(500).send({ error });
            else {
                res.send(results);
            }
            return res;
        });
});

app.post('/authorizeUser', function (req, res) {
    const { username, password } = req.body;
    try {
        const password_decypted_bytes = CryptoJS.AES.decrypt(password, '<PLACEHOLDER_ENCRYPTION_KEY>');
        const password_decypted = password_decypted_bytes.toString(CryptoJS.enc.Utf8);
        if (password_decypted === null || password_decypted === "") {
            res.send('Not Authorized : Password can not be empty');
            return;
        }
        var ldap_client = ldap.createClient({
            url: '<PLACEHOLDER_LDAP_URL>'
        });
        ldap_client.bind(`${username}@<PLACEHOLDER_LDAP_DOMAIN>`, password_decypted, function (err) {
            if (err != null) {
                console.log(err)
                res.send('Not Authorized : Username or password are incorrect');
                ldap_client.destroy();
                return;
            } else {
                const query = `SELECT authorizationIdCOMA FROM emma.users WHERE UserName="${username}"`
                pool.query(query, function (error, results) {
                    if (error) res.status(500).send({ error });
                    else {
                        if (results && results[0] && results[0].authorizationIdCOMA > 1) {
                            res.send('Authorized!');
                        } else {
                            res.send('Not Authorized : You do not have permissions for this app');
                        }
                    }
                    ldap_client.destroy();
                    return;
                });
            }
        });
    } catch (error) {
        res.send(`Not Authorized : ${err}`);
        return;
    }
});

app.post('/removeCourse/:year', function (req, res) {
    const { year } = req.params;
    const courseName = `${req.body.courseName} ${year}`;
    pool.getConnection(function (err, connection) {
        if (err) {
            if (connection) {
                connection.rollback(function () {
                    connection.release();
                });
            }
            res.status(500).send({ error })
        } else {
            connection.beginTransaction(async function (error) {
                if (error) {
                    res.status(500).send(error);
                    connection.release();
                } else {
                    try {
                        await common.removeAllUsersFromCourseProm(courseName, year);
                    } catch (error) {
                        connection.rollback(function () { connection.release(); });
                        res.status(500).send(error);
                        return res;
                    }
                    let query = '';
                    query += `DELETE from coma.coursetodatetime WHERE CourseID = (select CourseID from coma.courses WHERE CourseName = "${courseName}" );`;
                    query += `DELETE from coma.coursedatetimetouser WHERE CourseID = (select CourseID from coma.courses WHERE CourseName = "${courseName}" );`;
                    query += `DELETE from coma.coursetouser WHERE CourseID = (select CourseID from coma.courses WHERE CourseName = "${courseName}" );`;
                    query += `DELETE from coma.courses WHERE CourseName = "${courseName}";`;
                    connection.query(query,
                        function (error, results, fields) {
                            if (error) {
                                connection.rollback(function () { connection.release(); });
                                res.status(500).send(error.sqlMessage)
                                return res;
                            }
                            connection.commit(function (error) {
                                if (error) {
                                    connection.rollback(function () { connection.release(); });
                                    res.status(500).send(error.sqlMessage);
                                    return res;
                                }
                                res.send("Course was removed successfully!");
                                connection.release()
                            });
                        });
                }
            });
        }
    });
});

app.post('/updateYearlyBudget/:year', function (req, res) {
    const { budget } = req.body;
    const { year } = req.params;
    pool.getConnection(function (err, connection) {
        if (err) {
            if (connection) {
                connection.rollback(function () {
                    connection.release();
                });
            }
            res.status(500).send({ error })
        } else {
            connection.beginTransaction(function (error) {
                if (error) {
                    res.status(500).send(error);
                    connection.release();
                } else {
                    const query = `UPDATE coma.budget SET yearlyBudget${year}="${budget}";`;
                    connection.query(query, function (error, results, fields) {
                        if (error) {
                            connection.rollback(function () { connection.release(); });
                            res.status(500).send(error)
                            return res;
                        }
                        connection.commit(function (error) {
                            if (error) {
                                connection.rollback(function () { connection.release(); });
                                res.status(500).send(error.sqlMessage);
                                return res;
                            }
                            res.send(true);
                            connection.release();
                        });
                    });
                }
            });
        }
    });
});

app.post('/updateYearlyTargetHours/:year', function (req, res) {
    const { hours } = req.body;
    const { year } = req.params;
    pool.getConnection(function (err, connection) {
        if (err) {
            if (connection) {
                connection.rollback(function () {
                    connection.release();
                });
            }
            res.status(500).send({ error })
        } else {
            connection.beginTransaction(function (error) {
                if (error) {
                    res.status(500).send(error);
                    connection.release();
                } else {
                    connection.query('UPDATE coma.hours SET yearlyTargetHours' + year + '="' + hours + '";',
                        function (error, results, fields) {
                            if (error) {
                                connection.rollback(function () { connection.release(); });
                                res.status(500).send(error);
                                return res;
                            }
                            connection.commit(function (error) {
                                if (error) {
                                    connection.rollback(function () { connection.release(); });
                                    res.status(500).send(error.sqlMessage);
                                    return res;
                                }
                                res.send(true);
                                connection.release();
                            });
                        });
                }
            });
        }
    });
});

app.post('/addCourse/:exists/:startYear/:origYear/:currYear', function (req, res) {
    const courseExists = (req.params.exists === 'true');
    const year = req.params.startYear;
    const courseName = req.body.name + ' ' + year;
    const origYear = req.params.origYear;
    const origCourseName = req.body.name + ' ' + origYear;

    pool.getConnection(function (err, connection) {
        if (err) {
            if (connection) {
                connection.rollback(function () {
                    connection.release();
                });
            }
            res.status(500).send({ err: err })
        } else {
            connection.beginTransaction(async function (error) {
                if (error) {
                    res.status(500).send(error);
                    connection.release();
                } else {
                    if (courseExists) {
                        try {
                            await common.removeAllUsersFromCourseProm(origCourseName, origYear);
                        } catch (error) {
                            res.status(500).send(error);
                            connection.rollback(function () { connection.release(); });
                            return res;
                        }
                    }
                    const query = `SELECT CourseID 
                        FROM coma.courses
                        WHERE CourseName ="${courseName}";`
                    connection.query(query, function (error, results, fields) {
                        if (error) {
                            connection.rollback(function () { connection.release(); });
                            res.status(500).send(error.sqlMessage);
                            return res;
                        }
                        if (results) {
                            const oldCourseId = results.length > 0 ? results[0].CourseID : null;
                            let queryString = '';
                            if (courseExists) {
                                queryString += 'DELETE from coma.coursetodatetime WHERE CourseID = (select CourseID from coma.courses WHERE CourseName = "' + origCourseName + '" ); ';
                                queryString += 'DELETE from coma.coursetouser WHERE CourseID = (select CourseID from coma.courses WHERE CourseName = "' + origCourseName + '" ); ';
                                queryString += 'DELETE from coma.courses WHERE CourseName = "' + origCourseName + '"; ';
                            }
                            queryString += 'INSERT INTO coma.courses ' +
                                'SET ' +
                                'CourseName = "' + courseName + '",' +
                                'Lecturer = "' + req.body.lecturer + '",' +
                                'TotalHours = "' + req.body.totalHours + '",' +
                                'Price = "' + req.body.price + '",' +
                                'Notes = "' + req.body.notes + '",' +
                                'TextForMail = "' + common.sqlizeStr(req.body.textForMail) + '",' +
                                'Location = "' + req.body.venue + '",' +
                                'IsIn = "' + (req.body.isIn ? 1 : 0) + '",' +
                                'IsMandatory = "' + (req.body.isMandatory ? 1 : 0) + '",' +
                                'CourseType = "' + (req.body.courseType ? 1 : 0) + '",' +
                                'IsConference = "' + (req.body.isConference ? 1 : 0) + '",' +
                                'Syllabus = "' + common.sqlizeStr(req.body.syllabus) + '", ' +
                                'Year = "' + req.body.year + '", ' +
                                'isTentative = "' + 0 + '", ' +
                                'Creator = "' + req.body.creator + '"; ';
                            for (let dateTime of req.body.schedule) {
                                const dateTimeStart = moment(dateTime.dateTimeStart);
                                const dateTimeEnd = moment(dateTime.dateTimeEnd);
                                queryString += 'INSERT INTO coma.coursetodatetime ' +
                                    'SET ' +
                                    'CourseID = (select CourseID from coma.courses WHERE CourseName = "' + courseName + '" ), ' +
                                    'DateTimeStart = "' + dateTimeStart.format('YYYY-MM-DD HH:mm:ss') + '",' +
                                    'DateTimeEnd = "' + dateTimeEnd.format('YYYY-MM-DD HH:mm:ss') + '"; ';
                            }
                            for (let user of req.body.participants) {
                                queryString += 'INSERT INTO coma.coursetouser ' +
                                    'SET ' +
                                    'CourseID = (select CourseID from coma.courses WHERE CourseName = "' + courseName + '" ), ' +
                                    'ID = "' + user.ID + '";';
                            }
                            if (courseExists && oldCourseId != null) {
                                queryString += 'UPDATE coursedatetimetouser SET courseID = (select CourseID from coma.courses WHERE CourseName = "' + courseName + '" ) WHERE courseID = "' + oldCourseId + '";';
                            }
                            connection.query(queryString,
                                function (error, results, fields) {
                                    if (error) {
                                        connection.rollback(function () { connection.release(); });
                                        res.status(500).send(error.sqlMessage);
                                        return res;
                                    }
                                    connection.commit(function (error) {
                                        if (error) {
                                            connection.rollback(function () { connection.release(); });
                                            res.status(500).send(error.sqlMessage);
                                            return res;
                                        }
                                        res.send("Course was added successfully!");
                                        connection.release();
                                    });

                                });
                        }
                    })
                }
            });
        }
    });
});

app.post('/addTentativeCourse/:exists/:startYear/:origYear/:currYear', function (req, res) {
    const courseExists = (req.params.exists === 'true');
    const year = req.params.startYear;
    const courseName = req.body.name + ' ' + year;

    pool.getConnection(function (err, connection) {
        if (err) {
            if (connection) {
                connection.rollback(function () {
                    connection.release();
                });
            }
            res.status(500).send({ err: err })
        } else {
            connection.beginTransaction(async function (error) {
                if (error) {
                    res.status(500).send(error);
                    connection.release();
                } else {
                    let queryString = '';
                    if (courseExists) {
                        const origYear = req.params.origYear;
                        const origCourseName = req.body.name + ' ' + origYear;
                        try {
                            await common.removeAllUsersFromCourseProm(origCourseName, origYear);
                        } catch (error) {
                            res.status(500).send(error);
                            connection.rollback(function () { connection.release(); });
                            return res;
                        }
                        queryString += 'DELETE from coma.coursetodatetime WHERE CourseID = (select CourseID from coma.courses WHERE CourseName = "' + origCourseName + '" );';
                        queryString += 'DELETE from coma.coursedatetimetouser WHERE CourseID = (select CourseID from coma.courses WHERE CourseName = "' + origCourseName + '" );';
                        queryString += 'DELETE from coma.coursetouser WHERE CourseID = (select CourseID from coma.courses WHERE CourseName = "' + origCourseName + '" );';
                        queryString += 'DELETE from coma.courses WHERE CourseName = "' + origCourseName + '"; ';
                    }
                    queryString += 'INSERT INTO coma.courses ' +
                        'SET ' +
                        'CourseName = "' + courseName + '",' +
                        'Year = "' + req.body.year + '", ' +
                        'Creator = "' + req.body.creator + '", ' +
                        'TotalHours = "' + req.body.totalHours + '", ' +
                        'isTentative = "' + (req.body.isTentative ? 1 : 0) + '",' +
                        'participantsAmountEstimated  = "' + req.body.participantsAmountEstimated + '"; ';
                    for (let dateTime of req.body.schedule) {
                        const dateTimeStart = moment(dateTime.dateTimeStart);
                        const dateTimeEnd = moment(dateTime.dateTimeEnd);
                        queryString += 'INSERT INTO coma.coursetodatetime ' +
                            'SET ' +
                            'CourseID = (select CourseID from coma.courses WHERE CourseName = "' + courseName + '" ),' +
                            'DateTimeStart = "' + dateTimeStart.format('YYYY-MM-DD HH:mm:ss') + '",' +
                            'DateTimeEnd = "' + dateTimeEnd.format('YYYY-MM-DD HH:mm:ss') + '"; ';
                    }
                    for (let user of req.body.participants) {
                        queryString += 'INSERT INTO coma.coursetouser ' +
                            'SET ' +
                            'CourseID = (select CourseID from coma.courses WHERE CourseName = "' + courseName + '" ),' +
                            'ID = "' + user.ID + '"; ';
                    }
                    connection.query(queryString,
                        function (error, results, fields) {
                            if (error) {
                                connection.rollback(function () { connection.release(); });
                                res.status(500).send(error.sqlMessage);
                                return res;
                            }
                            connection.commit(function (error) {
                                if (error) {
                                    connection.rollback(function () { connection.release(); });
                                    res.status(500).send(error.sqlMessage);
                                    return res;
                                }
                                res.send("Course was added successfully!");
                                connection.release();
                            });

                        });

                }
            });
        }
    });
});

app.post('/addUserToCourse/:ID/:year', function (req, res) {
    const ID = req.params.ID;
    const year = req.params.year;
    const courseName = req.body.courseName + ' ' + year;
    pool.getConnection(function (err, connection) {
        if (err) {
            if (connection) {
                connection.rollback(function () {
                    connection.release();
                });
            }
            res.status(500).send({ error })
        } else {
            connection.beginTransaction(function (error) {
                if (error) {
                    res.status(500).send(error);
                    connection.release();
                } else {
                    connection.query('INSERT INTO coma.coursetouser ' +
                        'SET ' +
                        'CourseID = (select CourseID from coma.courses WHERE CourseName = "' + courseName + '" ),' +
                        'ID = "' + ID + '"; ',
                        function (error, results, fields) {
                            if (error) {
                                connection.rollback(function () { connection.release(); });
                                res.status(500).send(error.sqlMessage);
                                return res;
                            }
                            connection.commit(function (error) {
                                if (error) {
                                    connection.rollback(function () { connection.release(); });
                                    res.status(500).send(error.sqlMessage);
                                    return res;
                                }
                                res.send("Added");
                                connection.release();
                            });
                        });
                }
            });
        }
    });
});

app.post('/setUserAttended/:ID/:courseName/:dateTimeStart/:dateTimeEnd/:year', function (req, res) {
    const { ID, year } = req.params;
    const courseName = url2Name(req.params.courseName) + ' ' + year;
    const dateTimeStart = moment(req.params.dateTimeStart);
    const dateTimeEnd = moment(req.params.dateTimeEnd);

    pool.getConnection(function (err, connection) {
        if (err) {
            if (connection) {
                connection.rollback(function () {
                    connection.release();
                });
            }
            res.status(500).send({ error });
            return
        }
        connection.beginTransaction(function (error) {
            if (error) {
                res.status(500).send(error);
                connection.release();
                return
            }
            const query = `SELECT *
                FROM coma.coursedatetimetouser
                WHERE
                    CourseID=(
                        SELECT CourseID
                        FROM coma.courses
                        WHERE CourseName="${courseName}"
                    )
                    AND ID="${ID}"
                    AND DateTimeStart="${dateTimeStart.format('YYYY-MM-DD HH:mm:ss')}"
                    AND DateTimeEnd="${dateTimeEnd.format('YYYY-MM-DD HH:mm:ss')}";`
            connection.query(query, function (error, results, fields) {
                if (error) {
                    connection.rollback(function () { connection.release(); });
                    res.status(500).send(error.sqlMessage);
                    return res;
                }
                if (results && results[0]) {
                    res.send("Already marked as 'attended'");
                    connection.release();
                    return
                }
                const query = 'INSERT INTO coma.coursedatetimetouser ' +
                    'SET ' +
                    'CourseID = (select CourseID from coma.courses where CourseName = "' + courseName + '"), ' +
                    'ID = "' + ID + '", ' +
                    'DateTimeStart ="' + dateTimeStart.format('YYYY-MM-DD HH:mm:ss') + '", ' +
                    'DateTimeEnd ="' + dateTimeEnd.format('YYYY-MM-DD HH:mm:ss') + '"; ' +
                    'UPDATE coma.users ' +
                    'SET EducationHours' + dateTimeStart.year() + ' = EducationHours' + dateTimeStart.year() + ' + (' +
                    dateTimeEnd.diff(dateTimeStart, "hours", true) + ') ' +
                    'WHERE  ID = "' + ID + '"; '
                connection.query(query, function (error, results, fields) {
                    if (error) {
                        connection.rollback(function () { connection.release(); });
                        res.status(500).send(error.sqlMessage);
                        return res;
                    }
                    connection.commit(function (error) {
                        if (error) {
                            connection.rollback(function () { connection.release(); });
                            res.status(500).send(error.sqlMessage);
                            return res;
                        }
                        res.send("Marked as 'attended'");
                        connection.release();
                    });
                });
            });
        });
    });
});

app.post('/removeUserAttended/:ID/:courseName/:dateTimeStart/:dateTimeEnd/:year', function (req, res) {
    const { ID, year } = req.params;
    const courseName = url2Name(req.params.courseName) + ' ' + year;
    const dateTimeStart = moment(req.params.dateTimeStart);
    const dateTimeEnd = moment(req.params.dateTimeEnd);

    pool.getConnection(function (err, connection) {
        if (err) {
            if (connection) {
                connection.rollback(function () {
                    connection.release();
                });
            }
            res.status(500).send({ error })
        } else {
            connection.beginTransaction(function (error) {
                if (error) {
                    res.status(500).send(error);
                    connection.release();
                } else {
                    connection.query('SELECT * FROM coma.coursedatetimetouser WHERE ' +
                        'CourseID = (select CourseID from coma.courses where CourseName = "' + courseName + '") AND ' +
                        'ID = "' + ID + '" AND ' +
                        'DateTimeStart ="' + dateTimeStart.format('YYYY-MM-DD HH:mm:ss') + '" AND ' +
                        'DateTimeEnd ="' + dateTimeEnd.format('YYYY-MM-DD HH:mm:ss') + '"; ',
                        function (error, results, fields) {
                            if (error) {
                                connection.rollback(function () { connection.release(); });
                                res.status(500).send(error.sqlMessage);
                                return res;
                            }
                            if (!results || !results[0]) {
                                res.send("Already marked as 'did not attend'");
                                connection.release();
                            } else {
                                connection.query('DELETE FROM coma.coursedatetimetouser WHERE ' +
                                    'CourseID = (select CourseID from coma.courses where CourseName = "' + courseName + '") AND ' +
                                    'ID = "' + ID + '" AND ' +
                                    'DateTimeStart ="' + dateTimeStart.format('YYYY-MM-DD HH:mm:ss') + '" AND ' +
                                    'DateTimeEnd ="' + dateTimeEnd.format('YYYY-MM-DD HH:mm:ss') + '"; ' +
                                    'UPDATE coma.users ' +
                                    'SET EducationHours' + dateTimeStart.year() + ' = EducationHours' + dateTimeStart.year() + ' - (' +
                                    dateTimeEnd.diff(dateTimeStart, "hours", true) + ') ' +
                                    'WHERE  ID = "' + ID + '"; ',
                                    function (error, results, fields) {
                                        if (error) {
                                            connection.rollback(function () { connection.release(); });
                                            res.status(500).send(error.sqlMessage);
                                            return res;
                                        }
                                        connection.commit(function (error) {
                                            if (error) {
                                                connection.rollback(function () { connection.release(); });
                                                res.status(500).send(error.sqlMessage);
                                                return res;
                                            }
                                            res.send("Marked as 'did not attend'");
                                            connection.release();
                                        });
                                    });
                            }
                        });
                }
            });
        }
    });
});

app.get('/getDidUserAttendCourse/:ID/:courseName/:year', function (req, res) {
    const { ID, year } = req.params;
    const courseName = url2Name(req.params.courseName) + ' ' + year;
    const query = `SELECT *
        FROM coma.coursedatetimetouser
        WHERE
            CourseID = (
                SELECT CourseID
                FROM coma.courses
                WHERE CourseName="${courseName}"
            )
            AND ID="${ID}";`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.post('/removeUserFromCourse/:ID/:year', function (req, res) {
    const { ID, year } = req.params;
    const courseName = `${req.body.courseName} ${year}`;
    common.removeUserFromCourse(ID, courseName, year, function (error) {
        if (error) {
            res.status(500).send(error);
            return res;
        } else {
            res.send("Removed");
        }
    });
});

app.get('/getAllCoursesData/:year', function (req, res) {
    const year = req.params.year;
    const query = 'SELECT ' +
        'c.CourseName, c.Lecturer, c.Syllabus, c.TotalHours, c.Price, c.Notes, c.TextForMail, ' +
        'c.Location, c.IsIn, c.isTentative, c.participantsAmountEstimated, ' +
        'c.IsMandatory, c.IsConference, c.CourseType, c.Year, c.Creator, ' +
        'cd.DateTimeStart, cd.DateTimeEnd, ' +
        'cu.participantsAmount ' +
        'FROM coma.courses c ' +
        'LEFT JOIN (' +
        'SELECT ' +
        'cd.CourseID, cd.DateTimeStart, cd.DateTimeEnd ' +
        'FROM coma.coursetodatetime cd ' +
        `WHERE YEAR(cd.DateTimeStart) = "${year}" ` +
        'GROUP BY 1, 2, 3' +
        ') cd ON c.CourseID = cd.CourseID ' +
        'LEFT JOIN (' +
        'SELECT ' +
        'CourseID, count(*) as participantsAmount ' +
        'FROM coma.coursetouser cu ' +
        'GROUP BY cu.CourseID' +
        ') cu ON c.CourseID = cu.CourseID ' +
        `WHERE c.Year = "${year}";`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getCourseParticipants/:CourseName/:year', function (req, res) {
    const { year } = req.params;
    const CourseName = url2Name(req.params.CourseName) + ' ' + year;
    const query = `SELECT DISTINCT (cu.ID)
        FROM coma.coursetouser cu
        LEFT JOIN coma.courses c ON c.CourseID = cu.CourseID
        WHERE c.CourseName="${CourseName}";`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getAllCoursesName/:year', function (req, res) {
    const { year } = req.params;
    const query = `SELECT c.CourseName FROM coma.courses c WHERE c.Year = "${year}";`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getAllCoursesWithAttended/:year', function (req, res) {
    const { year } = req.params;
    const query = `
        SELECT CourseName
        FROM coma.courses
        WHERE CourseID IN (
            SELECT course.CourseID
            FROM (
                SELECT
                    CourseID,
                    COUNT(DISTINCT DateTimeStart, DateTimeEnd) sessions
                    FROM coma.coursetodatetime
                    WHERE Year(DateTimeStart)="${year}" 
                    GROUP BY 1
            ) AS course
            JOIN (
                SELECT
                    CourseID,
                    COUNT(DISTINCT DateTimeStart, DateTimeEnd) sessions
                    FROM coma.coursedatetimetouser
                    WHERE id IS NOT NULL
                    GROUP BY 1    
                ) AS participants
            ON course.CourseID = participants.CourseID
            WHERE course.sessions = participants.sessions
            GROUP BY 1
        ) GROUP BY 1`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getSumEmpPerMonth/:year', function (req, res) {
    const { year } = req.params;
    const query = `CALL coma.spr_getSumEmpPerMonth(${year})`;
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            var stringRes = JSON.stringify(results[0]);
            res.send(stringRes);
        }
        return res;
    });
});

app.get('/getPreciseOldYearDataPerMonth/:ID/:year/:curYear', function (req, res) {
    const { year, ID } = req.params;
    const query = `CALL coma.spr_getPrecisetHoursPerMonthByManagerUsingOldData(${ID}, ${year})`;
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            var stringRes = JSON.stringify(results[0]);
            res.send(stringRes);
        }
        return res;
    });
});

app.get('/getPredictOldYearDataPerMonth/:ID/:year/:curYear', function (req, res) {
    const { year, ID } = req.params;
    const query = `CALL coma.spr_getPredictHoursPerMonthByManagerUsingOldData(${ID}, ${year})`;
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            var stringRes = JSON.stringify(results[0]);
            res.send(stringRes);
        }
        return res;
    });
});

app.get('/getAmountEmployees/:ID/:year', function (req, res) {
    const { ID } = req.params;
    const query = `CALL coma.spr_getAmountEmployees(${ID})`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            var stringRes = JSON.stringify(results[0]);
            res.send(stringRes);
        }
        return res;
    });
});

app.get('/getSumEmpPerMonth/:year', function (req, res) {
    const { year } = req.params;
    const query = `CALL coma.spr_getSumEmpPerMonth(${year})`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results[0]);
        }
        return res;
    });
});

app.get('/getSumEmpPerMonthPerManager/:ID/:year', function (req, res) {
    const { ID, year } = req.params;
    const query = `SELECT
            empCount,
            predictHours,
            presiceHours
	    FROM houersPerMonthPerManager
        WHERE ID=${ID} and year(recoredDate)=${year}
        ORDER BY month(recoredDate);`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getHoursPrecise/:year', function (req, res) {
    const year = req.params.year;
    const query = `SELECT
        month(DateTimeStart) as MonthNum,
        sum(TIMESTAMPDIFF(HOUR,DateTimeStart, DateTimeEnd)) as targetSum 
    FROM coma.coursedatetimetouser CU
    LEFT JOIN emma.users U ON CU.ID = U.sircID  
    WHERE
        year(CU.DateTimeStart)=${year}
        AND U.category='SIRC'
    GROUP BY MonthNum;`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getHoursTentative/:year', function (req, res) {
    const { year } = req.params;
    const query = `SELECT
            month(cd.DateTimeStart) as MonthNum,
		    sum(c.TotalHours*c.participantsAmountEstimated) as hours
		FROM coma.courses c
        LEFT JOIN  coma.coursetodatetime cd on c.CourseID=cd.CourseID
        WHERE c.isTentative=1 and year(cd.DateTimeStart)=${year}
        GROUP BY MonthNum`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});


app.get('/getHoursPredicted/:year', function (req, res) {
    const { year } = req.params;
    const query = `SELECT
        t2.MonthNum,
        sum(t2.totalParticipents*t2.totalH) AS targetSum
    FROM (
        SELECT
            cr.CourseID AS Cname,
            month(DateTimeStart) AS MonthNum,
            sum(TIMESTAMPDIFF(HOUR,DateTimeStart,DateTimeEnd)) AS totalH,
            t1.totalParticipents AS totalParticipents
        FROM coma.coursetodatetime cr
        LEFT JOIN (
                    SELECT
                        CourseID ,
                        COUNT(CU.ID) AS totalParticipents 
                    FROM coma.coursetouser CU
                    LEFT JOIN emma.users U ON CU.ID = U.sircID
                    WHERE U.Category = 'SIRC'
                    GROUP BY CourseID
        ) t1 ON cr.CourseID = t1.CourseID
        WHERE year(cr.DateTimeStart)=${year}
        GROUP BY cr.CourseID, month(DateTimeStart)
    ) t2
    GROUP BY t2.MonthNum;`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getCourse/:courseName/:year', function (req, res) {
    const { year } = req.params;
    const courseName = url2Name(req.params.courseName);
    const query = `SELECT
        c.CourseName, c.Lecturer, c.Syllabus, c.TotalHours, c.Price, c.Notes,
        c.TextForMail, c.Location, c.IsIn, c.IsMandatory, c.IsConference,
        c.CourseType, c.Year, c.Creator, c.isTentative, c.participantsAmountEstimated,
        cd.DateTimeStart, cd.DateTimeEnd,
        cu.ID
    FROM coma.courses c
    LEFT JOIN coma.coursetodatetime cd ON c.CourseID = cd.CourseID
    LEFT JOIN coma.coursetouser cu ON c.CourseID = cu.CourseID
    WHERE
        c.CourseName like "%${courseName}%"
        AND c.Year=${year}`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getCourseAttendance/:courseName/:year', function (req, res) {
    const { year } = req.params;
    const courseName = url2Name(req.params.courseName);
    const query = `SELECT
        c.CourseName,
        cdu.DateTimeStart, cdu.DateTimeEnd, cdu.ID
    FROM coma.coursedatetimetouser cdu
    LEFT JOIN coma.courses c ON cdu.CourseID=c.CourseID        
    WHERE
        c.CourseName like "%${courseName}%"
        AND c.Year=${year}`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getCourseAttendanceDetailes/:courseName/:year', function (req, res) {
    const { year } = req.params;
    const courseName = url2Name(req.params.courseName) + ' ' + year;
    const query = `SELECT
        U.sircID,
        concat(U.firstName, ' ', U.lastName) as fullName,
        U.firstName,
        U.lastName,
        U.genNum,
        U.email
    FROM coma.coursetouser C
    LEFT JOIN emma.users U ON coma.C.ID = U.sircID
    WHERE C.CourseID=(
        SELECT CourseID FROM coma.courses WHERE CourseName="${courseName}"
    );`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getCourseAttendancedList/:courseName/:year', function (req, res) {
    const { year } = req.params;
    const courseName = url2Name(req.params.courseName) + ' ' + year;
    const query = `SELECT U.lastName, U.firstName
        FROM coma.coursetouser C
        LEFT JOIN emma.users U ON coma.C.ID = U.sircID
        WHERE C.CourseID=(
            SELECT CourseID from coma.courses where CourseName="${courseName}"
        )
        ORDER BY U.lastName`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get(['/searchCourses//:year', '/searchCourses/:searchTerm/:year'], function (req, res) {
    const { year, searchTerm = '' } = req.params;
    const query = `SELECT CourseName
        FROM coma.courses
        WHERE LOWER(CourseName) like LOWER("%${searchTerm}%${year}")`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.get('/getCourseExists/:courseName/:startYear/:year', function (req, res) {
    const year = req.params.startYear;
    const courseName = url2Name(req.params.courseName) + ' ' + year;
    const query = `SELECT CourseName FROM coma.courses WHERE CourseName="${courseName}";`
    pool.query(query, function (error, results, fields) {
        if (error) res.status(500).send({ error });
        else {
            res.json(results);
        }
        return res;
    });
});

app.post('/sendInvites/:year', function (req, res) {
    const { year } = req.params;
    const { fromUserID, fromFullName } = req.body;
    const courseName = url2Name(req.body.courseName);
    const fullCourseName = courseName + ' ' + year;
    let query = `SELECT
            c.Location, c.Syllabus, c.Lecturer, c.TextForMail,
            cd.DateTimeStart, cd.DateTimeEnd
        FROM coma.courses c
        LEFT JOIN coma.coursetodatetime cd ON c.CourseID = cd.CourseID
        WHERE c.CourseName="${fullCourseName}"`
    pool.query(query, function (error, locAndDates, fields) {
        if (error) {
            res.status(500).send({ error })
            return;
        }
        let query = `SELECT u.email, u.firstName, u.lastName
            FROM coma.coursetouser cu
            LEFT JOIN emma.users u ON cu.ID = u.sircID
            WHERE
                u.email IS NOT NULL
                AND u.email != ' '
                AND cu.CourseID=(
                    SELECT CourseID FROM coma.courses WHERE CourseName = "${fullCourseName}"
                );

            SELECT userName, email from emma.users where sircID = "${fromUserID}";`
        pool.query(query, function (error, results, fields) {
            if (error) {
                res.status(500).send({ error })
                return;
            }
            const [users, user_info] = results;
            const { userName: fromUser, email: fromEmail } = user_info[0];
            comaMailer.sendInvites(fromUser, fromFullName, fromEmail, courseName, locAndDates, users, function (error) {
                if (error) {
                    res.status(500).send({ error: error.toString() });
                    return;
                }
                res.send('Sent');
                return;
            });
        });
    });
});

app.post('/sendMail', function (req, res) {
    const { fromFullName, fromEmail, toEmailArray, subject, htmlContent } = req.body;
    comaMailer.sendMailWrapper(fromFullName, fromEmail, toEmailArray, subject, htmlContent, function (err) {
        if (err) {
            res.status(500).send({ error: err.toString() });
            res.end();
            return;
        }
        res.send(true);
        res.end();
        return;
    });
});

const port = Number(process.env.PORT) ?? 3000
app.listen(port);
console.log(`listening on port ${port}`);
