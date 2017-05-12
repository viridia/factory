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
* Improve JSON schema error messages.
* Logging

Logging:
* http stream? No because that doesn't permit load-balancing. DS is the better strategy.
  * unless *every* director instance is going to listen to logs
  * maybe that's not so bad.
* topic: job.{jobId}.logs:
