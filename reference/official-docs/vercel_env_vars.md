# Managing environment variables

> **Source:** https://vercel.com/docs/environment-variables/managing-environment-variables
> **取得日:** 2026-03-15

Environment variables are key-value pairs configured outside your source code so that each value can change depending on the Environment.

**Changes to environment variables are not applied to previous deployments, they only apply to new deployments. You must redeploy your project to update the value of any variables you change in the deployment.**

## Declare an environment variable

To declare an Environment Variable for your deployment:

1. From your [dashboard](https://vercel.com/dashboard), select your project. If necessary, you can also set environment variables team-wide so that they will be available for all projects.
2. Open **Settings** in the sidebar.
3. Go to **Environment Variables** in your **Project Settings**.
4. Enter the desired **Name** for your Environment Variable.
5. Then, enter the **Value** for your Environment Variable. The value is encrypted at rest so it is safe to add sensitive data like authentication tokens or private keys.
6. Configure which deployment environment(s) this variable should apply to (Production / Preview / Development).
7. Click **Save**.
8. To ensure that the new Environment Variable is applied to your deployment, you must **redeploy** your project.

## Viewing, editing, or deleting an environment variable

1. From your [dashboard](https://vercel.com/dashboard), select your project.
2. Open **Settings** in the sidebar.
3. Go to **Environment Variables** in your **Project Settings**.
4. Below the *Add New* form is a list of all the environment variables for the Project.
5. You can search for an existing Environment Variable by name using the search input and/or filter by Environment.
6. To edit or delete the Environment Variable, **click the three dots** to the right of the Environment Variable name.

## Environments

| Environment | Description |
|-------------|-------------|
| **Production** | Applied to your next Production Deployment. Push a commit to the Production Branch (usually `main`) or run `vercel --prod`. |
| **Preview** | Applied to your next Preview Deployment. Created when you push to a branch that is not the Production Branch. |
| **Development** | Used when running your project locally with `vercel dev`. |

## Environment variable size

- Total: **64 KB** per deployment (all variables combined)
- Edge Functions / Middleware: **5 KB** per variable

## Redeploy after changes

Any change you make to environment variables are not applied to previous deployments — only to new deployments.

To redeploy:
1. Go to the **Deployments** tab
2. Find the latest deployment
3. Click **...** (three dots) to the right
4. Select **Redeploy**
