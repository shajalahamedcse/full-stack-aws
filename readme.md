### AWS Setup

IAM is used to manage access to different AWS services:

    * WHO is trying to access services (authentication)
  
    * WHICH service are they trying to access (authorization)
  
    * WHAT are they trying to do with these servies (authorization)
  


Instead of using the root user , let's configure a new user with more restrictive permissions.

```
    We will be using the us-west-1 region throughout this course.
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