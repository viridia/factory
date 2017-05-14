# Queue

This module is a plan B in case rethinkdb-job-queue doesn't work out.

# Unique ID

* This is the sticking point: how to generate short unique ids within a distributed database.
  The standard way of generating ids generates large strings.
