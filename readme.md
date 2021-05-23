### AWS Setup

IAM is used to manage access to AWS services:
    * WHO is trying to access (authentication)
    * WHICH service are they trying to access (authorization)
    * WHAT are they trying to do (authorization)
<kbd> <img width="300" alt="1-new-iam" src="images/1-new-iam.png"> </kbd>


Instead of using the root user (assuming you already set one up), let's configure a new user with more restrictive permissions.

We will be using the us-west-1 region throughout this course.

Navigate to the Amazon IAM dashboard, click "Users" and then "Add user". Add a username, select both of the checkmarks next to the "Access type", and then uncheck "Require password reset":

image



On the "Permissions" page, click "Attach existing policies directly" and check both the "Administrator Access" and "Billing" policies. Click "Next" to review and then create the new user.

image


Then, update your ~/.aws/credentials file. Take note of the generated password and log in, with your new user, at https://YOUR_AWS_ACCOUNT_ID.signin.aws.amazon.com/console.