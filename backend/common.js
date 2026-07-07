var util = require('util');

var { pool } = require('./connect-server.js');


pool.queryProm = util.promisify(pool.query);

var removeUserFromCourse = function (ID, courseName, year, callback) {

  pool.getConnection(function (err, connection) {
    if (err) {
      if (connection) {
        connection.rollback(function () {
          connection.release();
        });
      }
      res.status(500).send({ error: error })
    } else {
      connection.beginTransaction(function (error) {
        if (error) {
          connection.release();
          callback(error);
        } else {
          connection.query('DELETE FROM coma.coursetouser ' +
            'WHERE ' +
            'CourseID = (select CourseID from coma.courses where CourseName = "' + courseName + '" ) ' +
            'AND ' +
            'ID = "' + ID + '"; ',
            function (error, results, fields) {
              if (error) {
                connection.rollback(function () { connection.release(); });
                callback(error.sqlMessage);
              } else {
                connection.commit(function (error) {
                  if (error) {
                    connection.rollback(function () { connection.release(); });
                    callback(error.sqlMessage);
                  } else {
                    connection.release();
                    callback(null)
                  }
                });
              }
            });
        }
      });
    }
  });
}


var removeAllUsersFromCourse = function (courseName, year, callback) {
  pool.getConnection(function (err, connection) {
    if (err) {
      if (connection) {
        connection.rollback(function () {
          connection.release();
        });
      }
      res.status(500).send({ error: error })
    } else {
      connection.beginTransaction(function (error) {
        if (error) {
          connection.release();
          callback(error);
        } else {
          connection.query('SELECT ID FROM coma.coursetouser WHERE CourseID = (select CourseID from coma.courses where CourseName = "' + courseName + '") ', function (error, results) {
            if (error) {
              connection.rollback(function () { connection.release(); });
              callback(error.sqlMessage);
            } else {
              let queryStr = '';
              for (let result of results) {
                queryStr += 'DELETE FROM coma.coursetouser WHERE ' +
                  'CourseID = (select CourseID from coma.courses where CourseName = "' + courseName + '" ) ' +
                  'AND ID = "' + result.ID + '"; ';
              }
              if (queryStr.length > 0) {
                connection.query(queryStr, function (error, results, fields) {
                  if (error) {
                    connection.rollback(function () { connection.release(); });
                    callback(error.sqlMessage);
                  } else {
                    connection.commit(function (error) {
                      if (error) {
                        connection.rollback(function () { connection.release(); });
                        callback(error.sqlMessage);
                      } else {
                        connection.release();
                        callback(null)
                      }
                    });
                  }
                });
              } else {
                connection.release();
                callback(null);
              }
            }
          })
        }
      });
    }
  });
}


var sqlizeStr = function (str) {
  str = str.replace(/'/g, "\'");
  str = str.replace(/"/g, '""');
  return str;
}

module.exports.removeUserFromCourse = removeUserFromCourse;
module.exports.removeAllUsersFromCourse = removeAllUsersFromCourse;
module.exports.removeUserFromCourseProm = util.promisify(removeUserFromCourse);
module.exports.removeAllUsersFromCourseProm = util.promisify(removeAllUsersFromCourse);
module.exports.sqlizeStr = sqlizeStr;
