# Design notes

## Components

* Worker
  * kube api
  * service
  * deployment
* Logger
  * rethinkdb
  * filter

* Next steps:
  * set working directory in container?
  * real-time logging.

Future:
* Figure out why we can't mount the sandbox directory
* Try running the queue on os x.
* Improve JSON schema error messages.
* Logging

Logging:
* http stream? No because that doesn't permit load-balancing. DS is the better strategy.
  * unless *every* director instance is going to listen to logs
  * maybe that's not so bad.
* topic: job.{jobId}.logs:
