# Design notes

## Components

* Next steps:
  * real-time logging.

Future:
* Render input params in job details.
* Improve JSON schema error messages.
* Number log lines sequentially
* Configurable concurrency limits.
* Move logger into common

Future:
* Page that shows orphan workers.
* Maybe don't delete workers quite so eagerly.
* Use the 'status' endpoint for watching worker status?
* recipe language: all tasks within a step? pattern?

Intervals:
Short: followUpIntervalMs
Medium: checkIntervalMs
Log: hibernateIntervalMs
