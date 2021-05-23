# AWS Setup
In this chapter, we'll configure a new AWS user with **IAM** and set up the **AWS CLI**.

## IAM 

**IAM** is used to manage access to different AWS services:

    * WHO is trying to access services (authentication)
  
    * WHICH service are they trying to access (authorization)
  
    * WHAT are they trying to do with these servies (authorization)
  


Instead of using the root user , let's configure a new user with more restrictive permissions.

```
    We will be using the ap-southeast-2 (Sydney) region throughout this course.
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

## Elastic Container Registry

In this chapter, we'll try to push our Docker images to the Elastic Container Registry (ECR), a private image registry of AWS.
### Image Registry

A container image registry is used to store and distribute container images. Docker Hub is one of the most popular image registry services for public images.

### ECR

Why Elastic Container Registry?

    * You do not want to add any of you private images into Docker Hub that have any sensitive info since the images will be publicly available.
    * ECR can work together with  Elastic Container Service and CodeBuild.
  
Navigate to Amazon ECR, click "Repositories", and then add two new repositories:

```
    test-backend
    test-frontend
```

Keep the tags **mutable**. For more on this, review the **Image Tag Mutability** guide.

Ignore the "build, tag, and push" instructions if they come up; just set up the images for now.

<kbd> <img width="700" alt="4-create-two-reposiotry" src="4-create-two-reposiotry.png"> </kbd>

You can also create a new repository with the **AWS CLI**:

```
    $ aws ecr create-repository --repository-name REPOSITORY_NAME --region ap-southeast-2
```


### Push Images to ECR

Now, we can build, tag, and push the images to ECR. 

Build the images:

```
    Replace <AWS_ACCOUNT_ID> with your AWS account ID.
```

```
$ docker build \
  -f services/backend/Dockerfile \
  -t 240868563953.dkr.ecr.ap-southeast-2.amazonaws.com/test-backend \
  ./services/backend

$ docker build \
  -f services/client/Dockerfile \
  -t 240868563953.dkr.ecr.ap-southeast-2.amazonaws.com/test-frontend \
  ./services/frontend

```
Be sure to replace <AWS_ACCOUNT_ID> with your AWS account ID.

We now need to authenticate the Docker CLI to use the ECR registry:

```
$ aws ecr get-login-password --region ap-southeast-2 \
  | sudo docker login --username AWS --password-stdin 240868563953.dkr.ecr.ap-southeast-2.amazonaws.com
```
You should see:

Login Succeeded

Push the images:

```
$ docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/test-frontend:dev

$ docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/test-backend:dev
```

Again, be sure to replace <AWS_ACCOUNT_ID> with your AWS account ID.

If everything goes well, a new image should be added to each of these repositories.

iamge


## CodeBuild

In this chapter, we'll configure CodeBuild for building Docker images.

### CodeBuild Setup

CodeBuild is a managed continuous integration service used for building and testing code.

Curious about the difference between continuous integration, continuous delivery, and continuous deployment? Check out the Continuous Delivery Explained guide.

Within the AWS Console, navigate to the CodeBuild dashboard and click "Create project".

image


Let's create a new project for building the Docker images.

#### Project configuration

    * "Project name" - flask-react-build
    * "Description" - build and test docker images
    * "Build badge" - check the flag to "Enable build badge"

iamge

#### Source

    * Use "GitHub" for the "Source provider". 
    * Select "Connect using OAuth", and click "Connect to Github" and allow access to your GitHub repos.
    * After authenticating, under "Repository", select "Repository in my GitHub account".  
    * Add the GitHub repository you created for this project.
    * Under "Additional configuration", check the box to "Report build statuses to source provider when your builds start and finish" under "Build Status".

iamge


Under "Primary source webhook events", check "Rebuild every time a code change is pushed to this repository". So, any time code is checked in, GitHub will ping the CodeBuild service, which will trigger a new build.

#### Environment
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


#### Buildspec, Artifacts, and Logs
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
    - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-frontend:prod
    - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-backend:prod
```

Here, we authenticate the Docker CLI to use the ECR registry, build the Docker images, and push them to ECR.

Commit and push your code to GitHub to trigger a new build. This time you should see the following error as the service role, flask-react-build-role, does not have the correct permissions:

An error occurred (AccessDeniedException) when calling the GetAuthorizationToken operation:
User: <omitted> is not authorized to perform: ecr:GetAuthorizationToken on resource: *
To fix, add the AmazonEC2ContainerRegistryPowerUser policy to the service role in the IAM dashboard.

image

## Elastic Load Balancer

In the chapter, we'll add a load balancer to distribute traffic and create a more reliable app with automatic scaling and failover.


### ELB
The Elastic Load Balancer (ELB) distributes incoming application traffic and scales resources as needed to meet traffic needs.

A load balancer is one of (if not) the most important parts of your application since it needs to always be up, routing traffic to healthy services, and ready to scale at a moment’s notice.

### Load balancers:

    * Enable horizontal scaling
    * Improve throughput, which can help decrease latency
    * Prevent the overloading of a single service
    * Provide a framework for updating service on the fly
    * Improve tolerance for back-end failures
  
There are currently three types of Elastic Load Balancers to choose from. We’ll be using the Application Load Balancer since it works at layer 7 of the OSI networking model, so it's designed for web applications that accept HTTP and HTTPS traffic. It provides support for path-based routing and dynamic port-mapping and it also enables zero-downtime deployments and support for A/B testing. The Application Load Balancer is one of those AWS services that makes ECS so powerful. In fact, before it’s release, ECS was not a viable container orchestration solution.

##### Configure ALB
Navigate to Amazon EC2, click "Load Balancers" on the sidebar, and then click the "Create Load Balancer" button. Select the "Create" button under "Application Load Balancer".

##### Step 1: Configure Load Balancer

    * "Name": webapp-alb
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

## Setting up RDS

Let's set up Amazon Relational Database Service (RDS).

### Why RDS?

First off, why should we use RDS rather than managing Postgres on our own inside an ec2 instance?

    1) Set up and management: With RDS, you are not responsible for configuring, securing, or maintaining the database -- AWS handles all this for you. Is this something that you need or want control over? Think about the costs associated with setting up and maintaining your own database. Do you have the time and knowledge to deal with backing up and restoring your database as well as failover and replication management? Will you need to hire a database administrator to do this for you?
   
    2) Data integrity: How do you plan to manage data volumes and persist data across containers? What happens if the container crashes?


### RDS Setup

    Navigate to Amazon RDS, click "Databases" on the sidebar, and then click the "Create database" button.

    **Engine options** and **Templates**:

    For the settings, select the latest version of the **"PostgreSQL" engine**.

    Use the "Free Tier" template.

<kbd> <img width="700" alt="1-rds-engine-options" src="images/1-rds-engine-options.png"> </kbd>


<kbd> <img width="700" alt="2-rds-template" src="images/2-rds-template.png"> </kbd>

### Settings

    * "DB instance identifier": **webapp-db**
    * "Master username": **webapp**
    * "Master password": Check "Auto generate a password"


<kbd> <img width="700" alt="3-rds-settings" src="images/3-rds-settings.png"> </kbd>

DB instance size, Storage, and Availability & durability

**Don't make any changes.**

### Connectivity

    * Select the "VPC" and "Security group" associated with ALB. 
    * Turn off "Public accessibility". 
    * Select one of the available "Subnets" as well -- either ap-southeast-2a or ap-southeast-2b.

<kbd> <img width="700" alt="4-rds-connection" src="images/4-rds-connection.png"> </kbd>


### Additional configuration

    * Change the "Initial database name" to **api_prod** and then create the new database.

    * Click the "View credential details" button to view the generated password. Take note of it.

    * You can quickly check the status using the AWS CLI.
  
```
    Master username: webapp
    Master password: JZTSg9QJr5ISN2ygOUIX
```

Unix users:

```
    $ aws --region ap-southeast-2 rds describe-db-instances \
    --db-instance-identifier webapp-db \
    --query 'DBInstances[].{DBInstanceStatus:DBInstanceStatus}'
```


You should see:

[
    {
        "DBInstanceStatus": "creating"
    }
]
Then, once the status is "available", you can grab the address.

Unix users:

```
    $ aws --region ap-southeast-2 rds describe-db-instances \
    --db-instance-identifier webapp-db \
    --query 'DBInstances[].{Address:Endpoint.Address}'
```

Take note of the production URI:
[
    {
        "Address": "webapp-db.cv0q1mdq4txg.ap-southeast-2.rds.amazonaws.com"
    }
]

postgres://webapp:<YOUR_RDS_PASSWORD>@<YOUR_RDS_ADDRESS>:5432/api_prod

For example:

postgres://webapp:JZTSg9QJr5ISN2ygOUIX@webapp-db.cv0q1mdq4txg.ap-southeast-2.rds.amazonaws.com:5432/api_prod

** Keep in mind that you cannot access the DB outside the VPC. So, if you want to connect to the instance, you will need to use SSH tunneling via SSHing into an EC2 instance on the same VPC and, from there, connecting to the database. We'll go through this process in a future chapter. **

## Elastic Container Service

Let's configure a Task Definition along with a Cluster and a Service within Elastic Container Service (ECS).

### ECS
ECS is a container orchestration system used for managing and deploying Docker-based containers.

It has four main components:

    Task Definitions
    Tasks
    Services
    Clusters
In short, Task Definitions are used to spin up Tasks that get assigned to a Service, which is then assigned to a Cluster.

image


Task Definition#
Task Definitions define which containers make up the overall app and how much resources are allocated to each container. You can think of them as blueprints, similar to a Docker Compose file.

Navigate to Amazon ECS, click "Task Definitions", and then click the button "Create new Task Definition". Then select "EC2" in the "Select launch type compatibility" screen.

Client
First, update the "Task Definition Name" to flask-react-client-td and then add a new container:

"Container name": client
"Image": YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-west-1.amazonaws.com/test-driven-client:prod
"Memory Limits (MB)": 300 soft limit
"Port mappings": 0 host, 80 container
We set the host port for the service to 0 so that a port is dynamically assigned when the Task is spun up.

image


It's important to note that you will not need to add the REACT_APP_API_SERVICE_URL environment variable to the container definition. This variable is required at the build-time, not the run-time, and is added during the building of the image on CodeBuild (within buildspec.yml):

docker build \
  --target builder \
  --cache-from $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-driven-client:builder \
  -f services/client/Dockerfile.prod \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-driven-client:builder \
  --build-arg NODE_ENV=production \
  --build-arg REACT_APP_API_SERVICE_URL=$REACT_APP_API_SERVICE_URL \
  ./services/client
It’s a good idea to configure logs, via LogConfiguration, to pipe logs to CloudWatch.

To set up, we need to create a new Log Group. Navigate to CloudWatch, in a new window, and click "Logs" on the navigation pane. If this is your first time setting up a group, click the "Let's get started" button and then the "Create log group" button. Otherwise, click the "Actions" drop-down button, and then select "Create log group". Name the group flask-react-client-log.

Back in ECS, add the Log Configuration:

image

Users#
For the users service, use the name flask-react-users-td, and then add a single container:

"Container name": users
"Image": YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-west-1.amazonaws.com/test-driven-users:prod
"Memory Limits (MB)": 300 soft limit
"Port mappings": 0 host, 5000 container
"Log configuration": flask-react-users-log
Then, add the following environment variables:

FLASK_ENV - production
APP_SETTINGS - src.config.ProductionConfig
DATABASE_URL - YOUR_RDS_URI
DATABASE_TEST_URL - postgres://postgres:postgres@api-db:5432/api_test
SECRET_KEY - my_precious
Change my_precious to a randomly generated string that's at least 50 characters. Use the actual RDS URI rather than YOUR_RDS_URI.

image

Add the container and create the new Task Definition.

Cluster
Clusters are where the actual containers run. They are just groups of EC2 instances that run Docker containers managed by ECS. To create a Cluster, click "Clusters" on the ECS Console sidebar, and then click the "Create Cluster" button. Select "EC2 Linux + Networking".

Add:

"Cluster name": flask-react-cluster
"Provisioning Model": It's recommended to stick with On-Demand Instance instances, but feel free to use Spot if that's what you prefer.
"EC2 instance type": t2.micro
"Number of instances": 4
"Key pair": Select an existing Key Pair or create a new one (see below for details on how to create a new Key Pair)

image

Select the default VPC and the previously created Security Group along with the appropriate subnets.

image


It will take a few minutes to set up the EC2 resources.

Key Pair
To create a new EC2 Key Pair, so we can SSH into the EC2 instances managed by ECS, navigate to Amazon EC2, click "Key Pairs" on the sidebar, and then click the "Create Key Pair" button.

Name the new key pair ecs and add it to "~/.ssh".

Service
Services instantiate the containers from the Task Definitions and run them on EC2 boxes within the ECS Cluster. Such instances are called Tasks. To define a Service, on the "Services" tab within the newly created Cluster, click "Create".

Create the following Services...

Client
Configure service:

"Launch type": EC2
"Task Definition":
"Family": flask-react-client-td
"Revision: LATEST_REVISION_NUMBER
"Service name": flask-react-client-service
"Number of tasks": 1


image

Leave the "Deployment type" setting at Rolling update.

Review the Updating a Service guide to learn more about rolling vs blue/green deployments.

You can configure how and where new Tasks are placed in a Cluster via "Task Placement" Strategies. We will use the basic "AZ Balanced Spread" in this course, which spreads Tasks evenly across Availability Zones (AZ), and then within each AZ, Tasks are spread evenly among Instances. For more, review Amazon ECS Task Placement Strategies

Click "Next step".

Configure network:

Select the "Application Load Balancer" under "Load balancer type".

"Load balancer name": flask-react-alb
"Container name : port": client:0:80


image


Click "Add to load balancer".

"Production listener port": 80:HTTP
"Target group name": flask-react-client-tg

image


Do not enable "Service discovery". Click the next button a few times, and then "Create Service".

Users
Configure service:

"Launch type": EC2
"Task Definition":
"Family": flask-react-users-td
"Revision: LATEST_REVISION_NUMBER
"Service name": flask-react-users-service
"Number of tasks": 1
Leave the "Deployment type" setting at Rolling update. Click "Next".

Configure network:

Select the "Application Load Balancer" under "Load balancer type".

"Load balancer name": flask-react-alb
"Container name: port": users:0:5000
Click "Add to load balancer".

"Production listener port": 80:HTTP
"Target group name": flask-react-users-tg
Do not enable "Service discovery". Click the next button a few times, and then "Create Service".

image

Sanity Check
Navigate to the EC2 Dashboard, and click "Target Groups".

Make sure flask-react-client-tg and flask-react-users-tg have a single registered instance each. Each of the instances should be unhealthy because they failed their respective health checks.

 To get them to pass the health checks, we need to add another inbound rule to the Security Group associated with the containers (which we defined when we configured the Cluster), allowing traffic from the Load Balancer to reach the containers.

Inbound Rules
Within the EC2 Dashboard, click "Security Groups" and select the Security Group associated with the containers, which is the same group assigned to the Load Balancer. Click the "Inbound" tab and then click "Edit"

Add a new rule:

"Type": All traffic
"Source": Choose Custom, then add the Security Group ID

image

Once added, the next time a container is added to each of the Target Groups, the instance should be healthy:

image

Essentially, when the Service was spun up, ECS automatically discovered and associated the new Cluster instances with the Application Load Balancer.

image

Next, navigate back to the Load Balancer and grab the "DNS name" from the "Description" tab, and navigate to http://LOAD_BALANCER_DNS_NAME/ping in your browser.

If all went well, you should see:

{
  "message": "pong!",
  "status": "success"
}
Try the /users endpoint at http://LOAD_BALANCER_DNS_NAME/users. You should see a 500 error since the database schema has not been applied.

You should be able to see this in the logs as well:

image

Database Schema#
We'll need to SSH into the EC2 instance associated with the users service to create the schema.

First, on the "Services" tab within the created Cluster, click the link for the flask-react-users-service service.

image

From there, click on the "Tasks" tab and click the link for the associated Task.

image

Then, click the link for the EC2 Instance ID and grab the public IP:

image

SSH into the instance:

$ ssh -i ~/.ssh/ecs.pem ec2-user@<EC2_PUBLIC_IP>
You may need to update the permissions on the Pem file -- i.e., chmod 400 ~/.ssh/ecs.pem.

Next, grab the Container ID for users (via docker ps), enter the shell within the running container, and then update the database:

$ docker exec -it Container_ID bash
# python manage.py recreate_db
# python manage.py seed_db

Navigate to http://LOAD_BALANCER_DNS_NAME/users again and you should see the users. Then, navigate to http://LOAD_BALANCER_DNS_NAME/. Manually test registering a new user, logging in, and logging out. Finally, ensure the Swagger UI works as well at http://LOAD_BALANCER_DNS_NAME/doc.
image


### ECS CodeBuild

In the chapter, we'll update the CodeBuild CI/CD workflow to add a new revision to the Task Definition and update the Service.



#### Zero Downtime Deployments
Before jumping in, check your understanding by updating the app on your own:

Make a quick change to the app locally.
Commit and push your code to GitHub.
Once the CodeBuild build passes, the new images will be built, tagged, and pushed to ECR.
Once done, add a new revision to the applicable Task Definitions.
Update the Service so that it uses the new revisions.
Once you update the Service, ECS will automatically pick up on these changes and instantiate the Task Definitions, creating new Tasks that will spin up on the Cluster instances.

ALB will run health checks on the new instances once they are up:

Pass? If the health checks pass, traffic is forwarded appropriately to the new Tasks while the old Tasks are spun down.
Fail? If the health checks fail, the new Tasks are spun down.
Try this again while pinging the service in a background terminal tab. Does the application go down at all. It shouldn't.

Now, let's automate that process.

##### Steps
Create local Task Definition JSON files
Update creation of Task Definitions on AWS via CodeBuild
Update Service via CodeBuild
Task Definitions
Let's create JSON files for the Task Definitions in a new folder at the project root called "ecs".

    ecs_client_taskdefinition.json
    ecs_users_taskdefinition.json

Client

```
{
  "containerDefinitions": [
    {
      "name": "client",
      "image": "%s.dkr.ecr.us-west-1.amazonaws.com/test-driven-client:prod",
      "essential": true,
      "memoryReservation": 300,
      "portMappings": [
        {
          "hostPort": 0,
          "protocol": "tcp",
          "containerPort": 80
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "flask-react-client-log",
          "awslogs-region": "us-west-1"
        }
      }
    }
  ],
  "family": "flask-react-client-td"
}

```

Users

```
{
  "containerDefinitions": [
    {
      "name": "users",
      "image": "%s.dkr.ecr.us-west-1.amazonaws.com/test-driven-users:prod",
      "essential": true,
      "memoryReservation": 300,
      "portMappings": [
        {
          "hostPort": 0,
          "protocol": "tcp",
          "containerPort": 5000
        }
      ],
      "environment": [
        {
          "name": "APP_SETTINGS",
          "value": "src.config.ProductionConfig"
        },
        {
          "name": "DATABASE_TEST_URL",
          "value": "postgres://postgres:postgres@api-db:5432/api_test"
        },
        {
          "name": "DATABASE_URL",
          "value": "%s"
        },
        {
          "name": "SECRET_KEY",
          "value": "%s"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "flask-react-users-log",
          "awslogs-region": "us-west-1"
        }
      }
    }
  ],
  "family": "flask-react-users-td"
}
```

CodeBuild
Update task definition
Add a new file to the root called deploy.sh:

#!/bin/sh

JQ="jq --raw-output --exit-status"

configure_aws_cli() {
  aws --version
  aws configure set default.region us-west-1
  aws configure set default.output json
  echo "AWS Configured!"
}

register_definition() {
  if revision=$(aws ecs register-task-definition --cli-input-json "$task_def" | $JQ '.taskDefinition.taskDefinitionArn'); then
    echo "Revision: $revision"
  else
    echo "Failed to register task definition"
    return 1
  fi
}

deploy_cluster() {

  # users
  template="ecs_users_taskdefinition.json"
  task_template=$(cat "ecs/$template")
  task_def=$(printf "$task_template" $AWS_ACCOUNT_ID $AWS_RDS_URI $PRODUCTION_SECRET_KEY)
  echo "$task_def"
  register_definition

  # client
  template="ecs_client_taskdefinition.json"
  task_template=$(cat "ecs/$template")
  task_def=$(printf "$task_template" $AWS_ACCOUNT_ID)
  echo "$task_def"
  register_definition

}

configure_aws_cli
deploy_cluster
Here, the AWS CLI is configured and then the deploy_cluster function is fired, which updates the existing Task Definitions with the definitions found in the JSON files we just created.

Add the AWS_RDS_URI and PRODUCTION_SECRET_KEY environment variables to the CodeBuild project.

Open the the project, click the "Edit" dropdown, and then select "Environment".

image

Then, add the two environment variables under the "Additional configuration" section.

image

To create a key, open the Python shell and run:

>>> import binascii
>>> import os
>>> binascii.hexlify(os.urandom(24))
b'958185f1b6ec1290d5aec4eb4dc77e67846ce85cdb7a212a'
Update the post_build in buildspec.yml:

post_build:
  commands:
  - echo pushing prod images to ecr...
  - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-driven-users:prod
  - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-driven-client:builder
  - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/test-driven-client:prod
  - chmod +x ./deploy.sh
  - bash deploy.sh
Attach the AmazonECS_FullAccess policy to the flask-react-build-role service role in the IAM dashboard.

image

Commit and push your code to GitHub. After the CodeBuild run passes, make sure new images were created and revisions to the Task Definitions were added.

image
image

You can ensure that the correct Task Definition JSON files were used to create the revisions by reviewing the latest revisions added to each of the Task Definitions. For example, open the latest revision for flask-react-users-td. Under the "Container Definitions", click the drop-down next to the users container. Make sure the DATABASE_URL and SECRET_KEY environment variables are correct:

image

Then, navigate to the Cluster. Update each of the Services so that they use the new Task Definitions.

iamge

Again, ECS will instantiate the Task Definitions, creating new Tasks that will spin up on the Cluster instances. Then, as long as the health checks pass, the load balancer will start sending traffic to them.

Make sure the instances associated with the Target Groups -- flask-react-client-tg and flask-react-users-tg -- are healthy.

Update service
Now, update deploy.sh, like so, to automatically update the Services after new revisions are added to the Task Definitions:

#!/bin/sh

JQ="jq --raw-output --exit-status"

configure_aws_cli() {
  aws --version
  aws configure set default.region us-west-1
  aws configure set default.output json
  echo "AWS Configured!"
}

register_definition() {
  if revision=$(aws ecs register-task-definition --cli-input-json "$task_def" | $JQ '.taskDefinition.taskDefinitionArn'); then
    echo "Revision: $revision"
  else
    echo "Failed to register task definition"
    return 1
  fi
}

# new
update_service() {
  if [[ $(aws ecs update-service --cluster $cluster --service $service --task-definition $revision | $JQ '.service.taskDefinition') != $revision ]]; then
    echo "Error updating service."
    return 1
  fi
}

deploy_cluster() {

  cluster="flask-react-cluster" # new

  # users
  service="flask-react-users-service"  # new
  template="ecs_users_taskdefinition.json"
  task_template=$(cat "ecs/$template")
  task_def=$(printf "$task_template" $AWS_ACCOUNT_ID $AWS_RDS_URI $PRODUCTION_SECRET_KEY)
  echo "$task_def"
  register_definition
  update_service  # new

  # client
  service="flask-react-client-service"  # new
  template="ecs_client_taskdefinition.json"
  task_template=$(cat "ecs/$template")
  task_def=$(printf "$task_template" $AWS_ACCOUNT_ID)
  echo "$task_def"
  register_definition
  update_service  # new

}

configure_aws_cli
deploy_cluster
Commit and push your code to GitHub to trigger a new run on CodeBuild. Once done, you should see a new revision associated with each Task Definition and the Services should now be running a new Task based on that revision.

Test everything out again.

Domain Name and HTTPS
Route 53 can be used to link a domain name to the instances running on the Cluster. The setup is fairly simple. Review Routing Traffic to an ELB Load Balancer for more details.

You should configure HTTPS as well. You'll need to set up an SSL certificate with Certificate Manager, add an HTTPS listener to the Application Load Balancer, and then proxy 443 traffic to HTTP ports 80 and 5000 on the instances via Target Groups.