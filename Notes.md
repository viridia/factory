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

* Recipes
  * Mandlebrot

* Next steps:
  * pub/sub job creation
    * We need to subscribe based on current query as well as current jobs.
  * job cancellation
  * create a container for the hello app.
  * TypeScript type definitions for certainty

Future:
* Improve JSON schema error messages.
* Bunyan logging

What if we did our own queue implementation?
* insert jobs into table
* use changefeeds to monitor
  * When we first start the scheduler:
    * Query all running tasks and find the minimum date
    * Set a timer to be woken then
    * when the timer goes off
    * do the following update:
      * for each job whose time is less than now
        * set time to now + 10 minutes
      * for one job (randomly chosen) whose time is less than now
          * set time to now + 10 minutes
          * return that job as the result
          * process the job
          * update job time
      * when making changes to a job
        * update the job next time to min(jobtime, now + quanta)
      * when change notification received:
        * query all jobs that need to be processed in the next 10 minutes
        * get the minimum time, or 10 minutes if there was no result
        * sleep for that amount of time
