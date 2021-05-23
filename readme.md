## AWS Setup

### IAM 

IAM is used to manage access to different AWS services:

    * WHO is trying to access services (authentication)
  
    * WHICH service are they trying to access (authorization)
  
    * WHAT are they trying to do with these servies (authorization)
  


Instead of using the root user , let's configure a new user with more restrictive permissions.

```
    We will be using the ap-southeast-2(Sydney) region throughout this course.
```

Navigate to the Amazon IAM dashboard, click "Users" and then "Add user". Add a username, select both of the checkmarks next to the "Access type", and then uncheck "Require password reset":

<kbd> <img width="700" alt="1-new-iam" src="images/1-new-iam.png"> </kbd>

On the "Create Group " page, add a groupname and attach "AdministratorAccess" policy to the group. Create that group and then attach a user to that group

<kbd> <img width="700" alt="2-creat-group" src="images/2-create-group.png"> </kbd>


<kbd> <img width="700" alt="3-add-user-to-group" src="images/3-add-user-to-group.png"> </kbd>

Then, update your ~/.aws/credentials file. Take note of the generated password and log in, with your new user, at https://YOUR_AWS_ACCOUNT_ID.signin.aws.amazon.com/console.

```
    $ aws configure
```

Now our aws cli is also ready.

### Elastic Container Registry

In this chapter, we'll push our Docker images to the Elastic Container Registry (ECR), a private image registry.
#### Image Registry

A container image registry is used to store and distribute container images. Docker Hub is one of the most popular image registry services for public images -- basically GitHub for Docker images.

#### ECR

Why Elastic Container Registry?

* You do not want to add any images to Docker Hub that have any sensitive info since the images will be publicly available
* ECR plays nice with Elastic Container Service and CodeBuild (both of which we'll be setting up shortly)

Navigate to Amazon ECS, click "Repositories", and then add two new repositories:

```
    test-driven-users
    test-driven-client
```

Keep the tags mutable. For more on this, review the Image Tag Mutability guide.

Ignore the "build, tag, and push" instructions if they come up; just set up the images for now.

image

You can also create a new repository with the AWS CLI:

$ aws ecr create-repository --repository-name REPOSITORY_NAME --region ap-southeast-2


#### Push Images to ECR
Now, we can build, tag, and push the images to ECR. We'll test it out with the current development versions of the Dockerfiles, without the required environment variables.

Build the images:

```
    Replace <AWS_ACCOUNT_ID> with your AWS account ID.
```

```
$ docker build \
  -f services/users/Dockerfile \
  -t <AWS_ACCOUNT_ID>.dkr.ecr.us-west-1.amazonaws.com/test-driven-users:dev \
  ./services/users

$ docker build \
  -f services/client/Dockerfile \
  -t <AWS_ACCOUNT_ID>.dkr.ecr.us-west-1.amazonaws.com/test-driven-client:dev \
  ./services/client

```
Be sure to replace <AWS_ACCOUNT_ID> with your AWS account ID.

We now need to authenticate the Docker CLI to use the ECR registry:

```
$ aws ecr get-login-password --region us-west-1 \
  | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-west-1.amazonaws.com
```
You should see:

Login Succeeded

Push the images:

```
$ docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-west-1.amazonaws.com/test-driven-users:dev

$ docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-west-1.amazonaws.com/test-driven-client:dev
```

Again, be sure to replace <AWS_ACCOUNT_ID> with your AWS account ID.

If all goes well, a new image should be added to each of the repositories.

iamge


### CodeBuild

In this chapter, we'll configure CodeBuild for building and testing Docker images.

#### CodeBuild Setup
CodeBuild is a managed continuous integration service used for building and testing code.

Curious about the difference between continuous integration, continuous delivery, and continuous deployment? Check out the Continuous Delivery Explained guide.

Within the AWS Console, navigate to the CodeBuild dashboard and click "Create project".

image


Let's create a new project for building the Docker images.

##### Project configuration
    * "Project name" - flask-react-build
    * "Description" - build and test docker images
    * "Build badge" - check the flag to "Enable build badge"

iamge

##### Source
Use "GitHub" for the "Source provider". Select "Connect using OAuth", and click "Connect to Github" and allow access to your GitHub repos. After authenticating, under "Repository", select "Repository in my GitHub account". Then, add the GitHub repository you created for this project.

Under "Additional configuration", check the box to "Report build statuses to source provider when your builds start and finish" under "Build Status".

iamge


Under "Primary source webhook events", check "Rebuild every time a code change is pushed to this repository". So, any time code is checked in, GitHub will ping the CodeBuild service, which will trigger a new build.

Environment
    * "Environment image" - use the "Managed image"
    * "Operating system" - "Ubuntu"
    * "Runtime" - "Standard"
    * "Image" - "aws/codebuild/standard:4.0"
    * "Image version" - "Always use the latest image for this runtime version"
    * "Privileged" - check the flag
    * "Service role" - "New service role"
    * "Role name" - flask-react-build-role

image


Under "Additional configuration":

    * set the "Timeout" to 10 minutes
    * add your AWS account ID as an environment variable called AWS_ACCOUNT_ID in plaintext

image


Buildspec, Artifacts, and Logs
    * Under "Build specifications", select "Use a buildspec file"
    * Skip the "Artifacts" section
    * Dump the logs to "CloudWatch"

image

Click "Create build project". Once created, click "Start build" to trigger a new build.

iamge

Use the default build configuration.

This should fail since we have not added a buildspec file to the repo.
iamge

Scroll down to the logs. You should see the following, which indicates the build failed because the buildspec file does not exist.

Create the buildspec.yml file in the project root:

```
version: 0.2

env:
  variables:
    AWS_REGION: "us-west-1"
    REACT_APP_API_SERVICE_URL: "http://localhost:5004"

phases:
  install:
    runtime-versions:
      docker: 18
  pre_build:
    commands:
      - echo logging in to ecr...
      - >
        aws ecr get-login-password --region $AWS_REGION \
          | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
  build:
    commands:
      - echo building images...
      - >
        docker build \
          -f services/users/Dockerfile.prod \
          -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-driven-users:prod \
          ./services/users
      - >
        docker build \
          -f services/client/Dockerfile.prod \
          -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-driven-client:prod \
          --build-arg NODE_ENV=production \
          --build-arg REACT_APP_API_SERVICE_URL=$REACT_APP_API_SERVICE_URL \
          ./services/client
  post_build:
    commands:
    - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-driven-users:prod
    - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-driven-client:prod
```

Here, we authenticate the Docker CLI to use the ECR registry, build the Docker images, and push them to ECR.

Commit and push your code to GitHub to trigger a new build. This time you should see the following error as the service role, flask-react-build-role, does not have the correct permissions:

An error occurred (AccessDeniedException) when calling the GetAuthorizationToken operation:
User: <omitted> is not authorized to perform: ecr:GetAuthorizationToken on resource: *
To fix, add the AmazonEC2ContainerRegistryPowerUser policy to the service role in the IAM dashboard.

image

### Elastic Load Balancer

In the chapter, we'll add a load balancer to distribute traffic and create a more reliable app with automatic scaling and failover.


#### ELB
The Elastic Load Balancer (ELB) distributes incoming application traffic and scales resources as needed to meet traffic needs.

A load balancer is one of (if not) the most important parts of your application since it needs to always be up, routing traffic to healthy services, and ready to scale at a moment’s notice.

#### Load balancers:

    * Enable horizontal scaling
    * Improve throughput, which can help decrease latency
    * Prevent the overloading of a single service
    * Provide a framework for updating service on the fly
    * Improve tolerance for back-end failures
  
There are currently three types of Elastic Load Balancers to choose from. We’ll be using the Application Load Balancer since it works at layer 7 of the OSI networking model, so it's designed for web applications that accept HTTP and HTTPS traffic. It provides support for path-based routing and dynamic port-mapping and it also enables zero-downtime deployments and support for A/B testing. The Application Load Balancer is one of those AWS services that makes ECS so powerful. In fact, before it’s release, ECS was not a viable container orchestration solution.

##### Configure ALB
Navigate to Amazon EC2, click "Load Balancers" on the sidebar, and then click the "Create Load Balancer" button. Select the "Create" button under "Application Load Balancer".

##### Step 1: Configure Load Balancer

    * "Name": flask-react-alb
    * "Scheme": internet-facing
    * "IP address type": ipv4
    * "Listeners": HTTP / Port 80
    * "VPC": Select the default VPC to keep things simple
    * "Availability Zones": Select at least two available subnets

```
Availability Zones are clusters of data centers.
```

image

##### Step 2: Configure Security Groups
Select an existing Security Group or create a new Security Group (akin to a firewall) called flask-react-security-group, making sure at least HTTP 80 and SSH 22 are open.

##### Step 3: Configure Routing
    * "Name": flask-react-client-tg
    * "Target type": Instance
    * "Port": 80
    * "Path": /

##### Step 4: Register Targets

Do not assign any instances manually since this will be managed by ECS. Review and then create the new load balancer.

Once created, take note of the new Security Group:
image


With that, we also need to set up Target Groups and Listeners:

iamge

#### Target Groups

Target Groups are attached to the Application Load Balancer and are used to route traffic to the containers found in the ECS Service.

You may not have noticed, but a Target Group called flask-react-client-tg was already created (which we'll use for the client app) when we set up the Application Load Balancer, so we just need to set up one more for the users service.

Within the EC2 Dashboard, click "Target Groups", and then create the following Target Group:

    "Target type": Instances
    "Target group name": flask-react-users-tg
    "Port": 5000
    Then, under "Health check settings" set the "Path" to /ping.

image

You should now have the following Target Groups:

image


#### Listeners
Back on the "Load Balancers" page within the EC2 Dashboard, select the flask-react-alb Load Balancer, and then click the "Listeners" tab. Here, we can add Listeners to the load balancer, which are then forwarded to a specific Target Group.

There should already be a listener for "HTTP : 80". Click the "View/edit rules" link, and then insert a new rule that forwards to flask-react-users-tg with the following conditions: IF Path is /users* OR /ping OR /auth* OR /doc OR /swagger*.

Update CodeBuild
Finally, navigate back to the Load Balancer and grab the "DNS name" from the "Description" tab:

image

We need to set this as the value of REACT_APP_API_SERVICE_URL in buildspec.yml:

```
    env:
    variables:
        AWS_REGION: "us-west-1"
        REACT_APP_API_SERVICE_URL: "http://<LOAD_BALANCER_DNS_NAME>"
```

Replace <LOAD_BALANCER_DNS_NAME> with the actual DNS name. For example:

```
    env:
    variables:
        AWS_REGION: "us-west-1"
        REACT_APP_API_SERVICE_URL: "http://flask-react-alb-828458753.us-west-1.elb.amazonaws.com"
```

Commit and push your code to trigger a new build. Make sure new images are added to ECR once the build is done.

With that, we can turn our attention to RDS.

Before configuring ECS, let's set up Amazon Relational Database Service (RDS).

### Why RDS?
First off, why should we use RDS rather than managing Postgres on our own within a Docker container?

    1) Set up and management: With RDS, you are not responsible for configuring, securing, or maintaining the database -- AWS handles all this for you. Is this something that you need or want control over? Think about the costs associated with setting up and maintaining your own database. Do you have the time and knowledge to deal with backing up and restoring your database as well as failover and replication management? Will you need to hire a database administrator to do this for you?
   
    2) Data integrity: How do you plan to manage data volumes and persist data across containers? What happens if the container crashes?
For more, check out this Reddit post.

##### RDS Setup
Navigate to Amazon RDS, click "Databases" on the sidebar, and then click the "Create database" button.

Engine options and Templates:

For the settings, select the latest version of the "PostgreSQL" engine.

Use the "Free Tier" template.

image

image

##### Settings

    "DB instance identifier": flask-react-db
    "Master username": webapp
    "Master password": Check "Auto generate a password"

