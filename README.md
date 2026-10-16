# CampusLoop — Smart Campus Lost & Found

CampusLoop is a full-stack web application that helps students report lost belongings, publish found-item reports, and coordinate item recovery on campus. It provides a central place to browse reports, discover possible matches, submit claims, and track the recovery process.

> **Project status:** Academic project / development version  
> **Repository:** https://github.com/Divya-Sirvi08/CampusLoop

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Run the Application](#run-the-application)
- [Application Workflow](#application-workflow)
- [API Overview](#api-overview)
- [Screenshots](#screenshots)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [Author](#author)
- [License](#license)

## Overview

Losing an item on campus can be stressful, and finding its owner can be difficult when reports are scattered across different channels. CampusLoop aims to simplify this process through a single lost-and-found platform.

Students can create Lost and Found reports, browse active listings, and submit claims for found items. Possible-match suggestions can help users identify related reports. The recovery workflow tracks the Found report as **Returned** and the associated Lost report as **Closed** when the handover is completed.

## Features

- **Lost-item reports:** Publish details about missing belongings.
- **Found-item reports:** Report items found around campus.
- **Browse listings:** View active Lost and Found reports.
- **Possible-match suggestions:** Help identify potentially related Lost and Found reports.
- **Claim submission:** Submit claimant details and ownership evidence.
- **Claim review workflow:** Support a staff verification and approval process.
- **Recovery status tracking:** Track claim and handover statuses.
- **Linked report handling:** Keep linked Lost and Found reports consistent during a completed recovery.
- **Responsive interface:** Use the application on desktop and smaller screens.

> Features available in your current version may differ from planned improvements. Confirm each feature in the running application before presenting it as complete.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Frontend development server | Vite |
| Styling | CSS |
| Backend | Node.js and Express |
| Database | MongoDB |
| Database object modelling | Mongoose |
| API communication | HTTP / JSON |
| Version control | Git and GitHub |

## Project Structure

```text
CampusLoop/
├── client/                 # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── package.json
│   └── ...
├── server/                 # Express backend
│   ├── models/
│   │   └── Item.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

The exact contents may vary as the project develops.

## Prerequisites

Install the following before running the project:

- [Node.js and npm](https://nodejs.org/) (a current LTS release is recommended)
- [MongoDB](https://www.mongodb.com/) — either a local MongoDB server or a MongoDB Atlas database
- [Git](https://git-scm.com/)
- A code editor such as [Visual Studio Code](https://code.visualstudio.com/)

Verify Node.js and npm:

```bash
node --version
npm --version
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Divya-Sirvi08/CampusLoop.git
cd CampusLoop
```

### 2. Install frontend dependencies

Open a terminal in the project root and run:

```bash
cd client
npm install
```

### 3. Install backend dependencies

Open a **second terminal** in the project root and run:

```bash
cd server
npm install
```

## Environment Variables

Create a file named `.env` inside the `server/` directory:

```text
server/
├── .env
├── server.js
└── ...
```

Add your MongoDB connection string:

```env
MONGODB_URI=your_mongodb_connection_string
```

Replace the placeholder with your own local MongoDB URI or MongoDB Atlas connection string. Use the exact variable name expected by `server/server.js`.

**Important:** Never commit or publish `.env` files, database credentials, tokens, or other secrets. The root `.gitignore` should exclude environment files.

If your backend uses additional environment variables, document their names and purpose here without publishing their secret values.

## Run the Application

Run the frontend and backend in **separate terminals**.

### Terminal 1 — Start the backend

```bash
cd server
node server.js
```

The backend is expected to run at:

```text
http://localhost:5000
```

This address assumes the default port configured in the current backend.

### Terminal 2 — Start the frontend

```bash
cd client
npm run dev
```

Vite usually displays a local URL similar to:

```text
http://localhost:5173
```

Open the URL printed by Vite in your browser.

> If either command fails, check the corresponding `package.json`, the terminal error, and your environment variables. Do not assume the application has started successfully until the terminal confirms it.

## Application Workflow

A typical recovery flow is:

1. A student creates a Lost report or a Found report.
2. Users browse the available reports and review possible matches.
3. A claimant submits a claim with identifying information and ownership evidence.
4. The claim is reviewed through the staff verification workflow.
5. Once the handover is completed, the Found report is marked **Returned** and its linked Lost report is marked **Closed**.
6. Completed reports can be reviewed or removed according to the application's configured rules.

Use fictional contact details and sample items when demonstrating the application.

## API Overview

The following routes are part of the backend workflow described in the project implementation. Check `server/server.js` for the current request body formats, validation rules, and exact behavior.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/items` | Retrieve item reports and possible-match information |
| `POST` | `/api/items` | Create an item report |
| `POST` | `/api/items/:id/claim` | Submit a claim for a Found report |
| `PATCH` | `/api/items/:id/approve-claim` | Approve a pending claim |
| `PATCH` | `/api/items/:id/return` | Complete the handover and update linked statuses |
| `DELETE` | `/api/items/:id` | Delete a report subject to the backend's rules |
| `GET` | `/api/claims` | Retrieve claim-related information |

These endpoints describe the current project workflow, not a guarantee that every route is publicly deployed or protected by authentication. Update this section whenever the API changes.

## Security Notes

- Keep `.env` files out of version control.
- Never publish database passwords, JWT secrets, access tokens, or private credentials.
- If credentials were committed to a public repository, remove them from the code and rotate/revoke them; deleting the file in a later commit does not remove the secret from Git history.
- Do not treat a hidden frontend button as access control. Sensitive staff operations must be authorized by the backend.
- Use authentication, role checks, input validation, and secure password hashing before using the project with real student data.
- Use fictional data in screenshots and demonstrations.

## Troubleshooting

### Backend cannot connect to MongoDB

- Confirm the MongoDB service or Atlas cluster is available.
- Check that `server/.env` exists and contains the correct `MONGODB_URI`.
- Check the variable name expected by the backend.
- For Atlas, verify database-user credentials and network access settings.
- Do not paste your connection string into public issues or screenshots.

### Frontend cannot reach the backend

- Confirm the backend is running on the expected port.
- Check the API base URL used by the frontend.
- Check the backend CORS configuration.
- Inspect the browser developer console and backend terminal for errors.

### `npm install` or startup fails

- Confirm Node.js and npm are installed.
- Run `npm install` in the relevant `client/` or `server/` directory.
- Read the complete terminal error and check the scripts in that directory's `package.json`.

### GitHub does not display screenshots

- Confirm the image files are committed to the repository.
- Check that the Markdown paths match the filenames and folder names exactly.
- Remember that file paths are case-sensitive on many deployment environments.

## Future Improvements

Potential improvements include:

- Student registration and login
- Secure password hashing and role-based staff authorization
- Search, sorting, and category filters
- Image uploads for reported items
- Email or in-app notifications
- Improved match ranking
- Automated tests for claim, return, and deletion workflows
- Deployment with production environment variables
- Accessibility and usability enhancements

These are possible future improvements; list them as completed only after implementing and testing them.

## Author

**Divya Sirvi**

- GitHub: [@Divya-Sirvi08](https://github.com/Divya-Sirvi08)
- Project: [CampusLoop](https://github.com/Divya-Sirvi08/CampusLoop)

## License

No license has been specified yet. If you want others to reuse or modify the project, choose and add an appropriate license (for example, MIT) after reviewing its terms.
