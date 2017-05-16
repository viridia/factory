# Design notes

## Components

* Next steps:
  * set working directory in container?
  * real-time logging.
  * concurrency limits.
  * don't release k8s jobs so eagerly

Future:
* Improve JSON schema error messages.
* Number tasks sequentially
* Number log lines sequentially

Logging:
* http stream? No because that doesn't permit load-balancing. DS is the better strategy.
  * unless *every* director instance is going to listen to every log event
  * maybe that's not so bad.
* topic: job.{jobId}.logs:

Future:
* Page that shows orphan workers.
* Maybe don't delete workers quite so eagerly.
* Use the 'status' endpoint for watching worker status?
* recipe language: all tasks within a step? pattern?

Intervals:
Short: followUpIntervalMs
Medium: checkIntervalMs
Log: hibernateIntervalMs
