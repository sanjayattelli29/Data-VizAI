# Smart Dataset Analyzer

A modern SaaS web application that automatically generates insightful visualizations from your datasets. Upload your data and get instant analysis with beautiful graphs for text, numeric, and mixed data types.

Built with Next.js, TypeScript, MongoDB, and Chart.js.

## Features

- **Automatic Data Type Detection**: Automatically identifies text, numeric, and mixed data types in your dataset
- **Smart Visualization Selection**: Selects the most appropriate chart type based on your data
- **Interactive Dashboards**: Create beautiful, interactive dashboards with multiple visualizations
- **User Authentication**: Secure user authentication with NextAuth.js
- **Responsive Design**: Modern UI that works on desktop and mobile devices
- **Data Table View**: View your uploaded data in a paginated table format
- **Bar Charts & Pie Charts**: Visualize your data with customizable charts

## Getting Started

### Prerequisites

- Node.js 14.x or later
- MongoDB database (you can use MongoDB Atlas for a free cloud database)

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=your_database_name
```

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Usage

1. Register for an account or sign in
2. Navigate to the dashboard
3. Upload a CSV dataset using the upload page
4. Explore various visualization options in the sidebar
5. View your upload history in the profile section

## Deployment to Vercel

This project is configured for easy deployment to Vercel. Follow these steps:

1. Push your code to a GitHub repository
2. Log in to [Vercel](https://vercel.com)
3. Click "New Project" and import your GitHub repository
4. Configure the following environment variables in the Vercel dashboard:
   - `NEXTAUTH_SECRET` - A secure random string for session encryption
   - `NEXTAUTH_URL` - Your production URL (e.g., https://your-app.vercel.app)
   - `MONGODB_URI` - Your MongoDB connection string
   - `DB_NAME` - Your database name
5. Click "Deploy"

### Troubleshooting Deployment

If you encounter any issues during deployment:

1. Check the Vercel build logs for specific errors
2. Ensure all environment variables are correctly set
3. Make sure your MongoDB instance is accessible from Vercel's servers
4. If you see TypeScript errors, they have been configured to be warnings only for production builds
4. View your data in the data table view
5. Generate visualizations using the bar chart and pie chart pages

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
