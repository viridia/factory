# Design notes

## Components

* Next steps:
  * real-time logging.

Future:
* How to measure machine utilization
* Improve JSON schema error messages.
* Number log lines sequentially
* Configurable concurrency limits.
* Move logger into common
* Try to get streaming from express to work.
* Unit tests for Director recipe routes.
  * We'll need a mock deepstream.
* Throttling:
  * Global limit on tasks
  * Tracking resource usage
* More complex recipes
* Recipe administration
* Recipe editing
* Administration:
  * System config params
  * Metrics page
  * Admin console

Future:
* Page that shows orphan workers.
* Use the 'status' endpoint for watching worker status?
* recipe language: all tasks within a step? pattern?

Intervals:
Short: followUpIntervalMs
Medium: checkIntervalMs
Log: hibernateIntervalMs

Log watching: The issue here is that we don't want to be spamming log updates to DS unless someone
is actually looking at those logs, otherwise we'll be broadcasting a lot of stuff. Deepstream has an
ability to listen for subscriptions, but since there are multiple director/schedulers there's no
easy way to pick one instance which is responsible for the broadcast.

What I'd like to do is have the frontend signal to the director that it wants to watch logs,
and have that director alone watch the log source for as long as the frontend is connected.
The problem here is that express streaming doesn't seem to work.
