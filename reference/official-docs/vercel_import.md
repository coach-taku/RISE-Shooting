# Import an existing project

> **Source:** https://vercel.com/docs/getting-started-with-vercel/import
> **取得日:** 2026-03-15

Create a new project on Vercel by importing your existing frontend project, built on any of our supported frameworks.

Your existing project can be any web project that outputs static HTML content (such as a website that contains HTML, CSS, and JavaScript). When you use any of Vercel's supported frameworks, we'll automatically detect and set the optimal build and deployment configurations for your framework.

## Steps

### 1. Connect to your Git provider

On the [New Project](https://vercel.com/new) page, under the **Import Git Repository** section, select the Git provider that you would like to import your project from.

Follow the prompts to sign in to either your GitHub, GitLab, or BitBucket account.

### 2. Import your repository

Find the repository in the list that you would like to import and select **Import**.

### 3. Optionally, configure any settings

Vercel will automatically detect the framework and any necessary build settings. However, you can also configure the Project settings at this point including the build and output settings and Environment Variables. These can also be set later.

- To update the framework, build command, output directory, install command, or development command, expand the **Build & Output Settings** section and update as needed.
- To set environment variables, expand the **Environment Variables** section and either paste or copy them in.
- You can also configure additional properties by adding a `vercel.json` to your project.

### 4. Deploy your project

Press the **Deploy** button. Vercel will create the Project and deploy it based on the chosen configurations.

### 5. Enjoy the confetti!

To view your deployment, select the Project in the dashboard and then select the **Domain**. This page is now visible to anyone who has the URL.

## Next Steps

Next, learn how to assign a domain to your new deployment.
