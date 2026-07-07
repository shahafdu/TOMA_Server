# COMA Backend
COMA helps manage employee's training programs. It is used by HR and managers.

## Development
1. Fill `USER_ID`/`USER_GID` in the _.env_ file. Call `id`` to know what values to use.

2. Using `docker`:

```bash
docker compose build
docker compose -f docker-compose.yaml -f development.yaml up coma_backend
#=> will call "npm ci && npm start"
#=> listenning on port 3000
#=> mapped to port 3008 on the host where you started docker

# To change 
# iif you need a shell, you can use
docker compose -f docker-compose.yml -f development.yaml run coma_backend bash
# If needed add "-p xxxx:yyyy" to map ports
# $ npm install
# $ npm start

# if you set the ENV variable DEBUG_SQL=true, it will print SQL trace information 
```

## Related Jenkins jobs
Those jobs can be found under the [Jenkins SWI group](http://jenmaster1:8080/job/SWI/):
- `emailNotificationsForManager`: Script that notifies all the managers of employees whose courses are scheduled to begin 30 days from the current day.
- `emailForCourseReview`: Each participant in a course that ends the day before the current day will receive an email requesting them to provide feedback about the course to the HR manager. <br>
- `autoDumpComa` run monthly, does monthly automatic coma db sql dump creation.
