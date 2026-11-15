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
- [Smart Item Matching](#smart-item-matching)
- [Chatbot Assistant](#chatbot-assistant)
- [API Overview](#api-overview)
- [Screenshots](#screenshots)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [Author](#author)
- [License](#license)

## Overview

Losing an item on campus can be stressful, and finding its owner can be difficult when reports are scattered across different channels. CampusLoop aims to simplify this process through a single lost-and-found platform.

Students can create Lost and Found reports, browse active listings, and submit claims for found items. Smart matching suggestions help users identify related reports. The chatbot assistant allows users to search existing item reports and get assistance with reporting and claiming items.

The recovery workflow tracks the Found report as **Returned** and the associated Lost report as **Closed** when the handover is completed.

## Features

- **Lost-item reports:** Publish details about missing belongings.
- **Found-item reports:** Report items found around campus.
- **Browse listings:** View active Lost and Found reports.
- **Smart Item Matching:** Uses semantic similarity to identify potentially related Lost and Found reports.
- **Possible-match suggestions:** Helps users discover potentially matching items.
- **Chatbot Assistant:** Provides an interactive chatbot to help users search for lost and found items.
- **Database-based Chatbot Search:** Searches actual item reports stored in MongoDB and displays possible matches with their locations.
- **Chatbot Help Support:** Answers common questions about reporting and claiming items.
- **No-match Handling:** Clearly informs users when no suitable matching report is found.
- **Claim submission:** Submit claimant details and ownership evidence.
- **Claim review workflow:** Supports a staff verification and approval process.
- **Recovery status tracking:** Track claim and handover statuses.
- **Linked report handling:** Keep linked Lost and Found reports consistent during a completed recovery.
- **Responsive interface:** Use the application on desktop and smaller screens.

> Features available in your current version may differ from planned improvements. Confirm each feature in the running application before presenting it as complete.

## Technology Stack

| Layer                       | Technology             |
| --------------------------- | ---------------------- |
| Frontend                    | React.js               |
| Frontend development server | Vite                   |
| Styling                     | CSS                    |
| Programming language        | JavaScript             |
| Backend                     | Node.js and Express.js |
| Database                    | MongoDB                |
| Database object modelling   | Mongoose               |
| Smart matching              | Semantic similarity    |
| Chatbot                     | Rule-based JavaScript  |
| API communication           | HTTP / JSON            |
| Version control             | Git and GitHub         |

## Project Structure

```text
CampusLoop/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── package.json
│   └── ...
│
├── server/
│   ├── models/
│   │   └── Item.js
│   │
│   ├── ai/
│   │   └── smartMatching.js
│   │
│   ├── routes/
│   │   └── chatbot.js
│   │
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

The exact contents may vary as the project develops.

## Prerequisites

Install the following before running the project:

- [Node.js and npm](https://nodejs.org/) (a current LTS release is recommended)
- [MongoDB](https://www.mongodb.com/) — either a local MongoDB server or a MongoDB Atlas database
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/)

Verify Node.js and npm:

```bash
node --version
npm --version
```

Verify Git:

```bash
git --version
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

Open a second terminal in the project root and run:

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
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

Replace the placeholder with your own local MongoDB URI or MongoDB Atlas connection string. Use the exact variable names expected by `server/server.js`.

**Important:** Never commit or publish `.env` files, database credentials, tokens, or other secrets. The root `.gitignore` should exclude environment files.

If your backend uses additional environment variables, document their names and purpose here without publishing their secret values.

## Run the Application

Run the frontend and backend in separate terminals.

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

> If either command fails, check the corresponding `package.json`, terminal error, and environment variables. Do not assume the application has started successfully until the terminal confirms it.

## Application Workflow

A typical recovery flow is:

1. A student creates a Lost report or a Found report.
2. Users browse the available reports and review possible matches.
3. Smart matching identifies potentially related Lost and Found reports.
4. Users interact with the chatbot to search for reported items.
5. The chatbot searches available item reports and displays possible matches with their locations.
6. If no suitable match is found, the chatbot informs the user.
7. A claimant submits a claim with identifying information and ownership evidence.
8. The claim is reviewed through the staff verification workflow.
9. Once the handover is completed, the Found report is marked **Returned** and its linked Lost report is marked **Closed**.
10. Completed reports can be reviewed or removed according to the application's configured rules.

Use fictional contact details and sample items when demonstrating the application.

## Smart Item Matching

CampusLoop includes a smart matching feature to help identify potentially related Lost and Found reports.

The matching functionality:

- Compares information provided in item reports.
- Uses semantic similarity to identify potentially related descriptions.
- Helps users discover relevant Lost and Found listings.
- Provides possible matches to make item recovery easier.

The matching feature is designed to reduce the effort required to manually search through multiple reports.

## Chatbot Assistant

CampusLoop includes an interactive chatbot assistant that helps users navigate the lost-and-found application.

### Chatbot Capabilities

- Responds to greetings and common user queries.
- Explains how to report lost and found items.
- Explains the item claiming process.
- Searches actual item reports stored in MongoDB.
- Identifies potentially matching reports based on user descriptions.
- Displays matching item details and locations.
- Provides a clear response when no suitable matching report is found.

### Chatbot Implementation

The chatbot uses JavaScript-based rule-driven responses and MongoDB item searches through the backend API.

The chatbot is integrated with the React frontend and communicates with the Express backend through the `/api/chat` endpoint.

It does not require an external generative AI API to answer its supported queries.

## API Overview

The following routes are part of the backend workflow described in the project implementation. Check `server/server.js` and the route files for the current request body formats, validation rules, and exact behavior.

| Method   | Endpoint                       | Purpose                                              |
| -------- | ------------------------------ | ---------------------------------------------------- |
| `GET`    | `/api/items`                   | Retrieve item reports and possible-match information |
| `POST`   | `/api/items`                   | Create an item report                                |
| `POST`   | `/api/items/:id/claim`         | Submit a claim for a Found report                    |
| `PATCH`  | `/api/items/:id/approve-claim` | Approve a pending claim                              |
| `PATCH`  | `/api/items/:id/return`        | Complete the handover and update linked statuses     |
| `DELETE` | `/api/items/:id`               | Delete a report subject to the backend's rules       |
| `GET`    | `/api/claims`                  | Retrieve claim-related information                   |
| `POST`   | `/api/chat`                    | Process chatbot messages and search item reports     |

These endpoints describe the current project workflow, not a guarantee that every route is publicly deployed or protected by authentication. Update this section whenever the API changes.

## Screenshots

Application screenshots can be added here to demonstrate:

- Home page and item listings
- Lost and Found reporting forms
- Smart item matching results
- Chatbot interface
- Claim submission and recovery workflow
- Staff workspace

Add screenshots to a project screenshots folder and link them here when available.

## Security Notes

- Keep `.env` files out of version control.
- Never publish database passwords, JWT secrets, access tokens, or private credentials.
- If credentials were committed to a public repository, remove them from the code and rotate/revoke them; deleting the file in a later commit does not remove the secret from Git history.
- Do not treat a hidden frontend button as access control. Sensitive staff operations must be authorized by the backend.
- Use authentication, role checks, input validation, and secure password hashing before using the project with real student data.
- The chatbot should use only relevant item-report information and must not expose private contact details, claim evidence, or staff-only information.
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

### Chatbot is not responding

- Confirm that the backend is running.
- Check that the frontend is sending requests to the correct API URL.
- Verify that the `/api/chat` endpoint is registered.
- Inspect the browser developer console and backend terminal for errors.
- Confirm that MongoDB contains item reports for search testing.

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
- Enhanced chatbot capabilities
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
