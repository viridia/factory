# Design notes

## Components

* Next steps:
  * non-real-time logging.
  * real-time logging.

Future:
* Improve JSON schema error messages.
* Number log lines sequentially
* Configurable concurrency limits.

Future:
* Page that shows orphan workers.
* Maybe don't delete workers quite so eagerly.
* Use the 'status' endpoint for watching worker status?
* recipe language: all tasks within a step? pattern?

Intervals:
Short: followUpIntervalMs
Medium: checkIntervalMs
Log: hibernateIntervalMs
