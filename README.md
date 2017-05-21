# Render Factory

A render farm and compute job scheduler built on Kubernetes and RethinkDB.

Various components:

* Director: Accepts job requests from web clients and reports on job status.
* Scheduler: Schedules individual tasks.
* Client: Web client which shows current jobs and allows submitting new jobs.
* (TBW)

# Local Development Environment

## Installation

You'll need the following command-line programs installed:

  * minikube
  * kubectl
  * docker
  * yarn

## Building and running

The factory has a lot of moving parts, and so getting it running has a lot of steps.

First, start your local Kubernetes cluster using minikube:

    minikube start

Open up the Kubernetes admin page in a browser:

    minikube dashboard

Set up shell environment variables so that docker will use the daemon running in the cluster.
Note that you **must** do this in every shell in which you plan to run docker commands.

    eval $(minikube docker-env)

Build the sample docker containers:

    yarn run build-image-mandelbrot

The script `vm` in the project root directory has a lot of useful features for starting and stopping
the various services.

Start the RethinkDB database in the minikube cluster:

    vm db start

Open up the rethinkdb admin page in a browser:

    minikube service rethinkdb-admin --url
    (cut and paste the resulting url into your browser)

Start the Deepstream.io service in the minikube cluster:

    vm ds start

Start the Kubernetes service proxy, needed to make REST calls from the host:

    vm proxy start

In separate shell windows, start each of the servers:

    yarn run start-client
    yarn run start-director
    yarn run start-scheduler

Once the director is running, seed the intitial recipe files into the database:

    ./director/bin/uploadrecipe.js ./director/recipes/mandelbrot.json

Now you can view the frontend at the following url:

    http://localhost:8087

## Running in a local cluster

You can also run the servers in a local Kubernetes cluster. Assuming you have minikube started
already, and your docker environment variables are set properly (see above), the commands are:

    yarn run build-image-client
    yarn run build-image-director
    yarn run build-image-scheduler
    ./vm client up
    ./vm ingress up
    ./vm director up
    ./vm scheduler up

    minikube ip # Prints out IP address of cluster

Now enter the address printed by the last step in your web browser. Note: you *must* use https,
and you will get a browser security warning, since there's no certificate.

## k8shell

`k8shell` is a simple docker container that mounts the project source tree as a shared volume,
so that you can access all of the source files from a virtual machine inside the cluster. k8shell
also contains some useful unix utilities like curl and git. One thing this allows you to do is
see all of the environment variables that a pod would see.

To use it, do the following:

    # Build the k8shell image
    yarn run build-image-k8shell

    # Mount the project source directory into the minikube VM:
    vm mount

    # Execute the container
    vm start

    # Get a bash shell in the container
    vm shell

    # Terminate the container
    vm stop
