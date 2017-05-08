# Render Factory

A render farm and compute job scheduler built on Kubernetes and RethinkDB.

Various components:

* Director: Accepts job requests from web clients and reports on job status.
* Scheduler: Schedules individual tasks.
* Client: Web client which shows current jobs and allows submitting new jobs.
* (TBW)

## Running

Start the local Kubernetes cluster:

    minikube start

Set up shell environment variables so that docker will use the daemon running in the cluster.
Note that you must do this in every shell in which you plan to run docker commands.

    eval $(minikube docker-env)

The script 'vm' in the project directory has a lot of useful features for starting and stopping
the various services.

Build the docker image for the director:

    vm build

In another shell window, mount your current development directory into the minikube VM:

    vm mount

To execute the container:

    vm start

To shell in to the container:

    vm shell

To stop the container:

    vm stop
