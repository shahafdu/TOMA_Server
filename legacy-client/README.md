# Toma

> This project is named `toma` even though it's called `coma` (or `cma`) in much of the code...

For developement:
```bash
# it uses a multi-stage build, so for dev you want to stop early...
docker build --target builder -t coma_client:builder .

# then start a dev shell...
docker run -it -e HOME=/tmp -p3008:4200 --user $(id -u):$(id -g) -v /home/arthurf/swi/CMA_Client:/code coma_client:builder bash
$ npm install --legacy-peer-deps
# to change which backend is used, edit src/urls.ts
# ideally we could just set
$ export COMA_BACKEND_HOST=http://dev-server:8484
# (assuming you started COMA with the defaut dev instructions)
# but the node version make it harder than it should be...
$ npm start
#=> https://your-server:3008/
```

*For dev* you may want to change the backend connection in `src/urls.ts`

---
# information about the application URLs and ports
URLs https://app.example.com points on host docker-prod-srv-1, port 8080
 
backend URL:https://api.example.com points on host docker-prod-srv-1, port 8080 
---

# Auto-generated docs from Angular

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.2.3.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
