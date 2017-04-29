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
* Pub / Sub
  * deepstream

* Schema:
  * Recipe
  * Job
    * Step
      * Task
  * Log
    * JobId
    * TaskId
    * Time
    * Message

* Queues:
  * Job Queue
  * Task Queue

* Recipes
  * Mandlebrot

* Next steps:
  * Create JobView react component
    * JobList
    * TaskList
    * TaskStatus
    * JobSubmissionForm
  x build deployment for rethinkdb
  * create a hello app that can talk to it (without container)
  x probably start with express
  * create a container for the hello app.
