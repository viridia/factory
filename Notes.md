# Design notes

## Components

* Database
  * rethinkdb
  * service
  * deployment
* Director
  * express
  * container: node.js
  * service
  * deployment
* Scheduler
  * rethinkdb-job-queue
  * container: node.js
  * kube api
  * service
  * deployment
* Worker
  * kube api
  * service
  * deployment
* Logger
  * rethinkdb
  * filter
* Client
  * Status page
  * React / Webpack

* Next steps:
  * pub/sub job creation
    * We need to subscribe based on current query as well as current jobs.
  * job cancellation
  * create a container for the hello app.
  * TypeScript type definitions for certainty

Future:
* Improve JSON schema error messages.
