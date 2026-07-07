var { pool } = require("./connect-server.js");

MonthyUpdateManagersCourses = function () {
  const now = new Date();
  const query = "CALL `coma`.`spr_monthlyUpdateHoursPerMonthPerManager`()";
  pool.query(query, function (error, results, fields) {
    if (error) {
      console.log(`(${now}) [MonthyUpdateManagersCourses] ERROR: ${error}`);
      return;
    }
    console.log(`(${now}) [MonthyUpdateManagersCourses] OK`);
    return results;
  });
};

MonthyUpdateManagersCourses();
