# Student Behavior Tracker (SBT) - Project Architecture & Analysis

## 1. Project Overview
The Student Behavior Tracker (SBT) is a full-stack web application designed for educational institutions to track, manage, and notify parents about student behavioral incidents. It features a unified dashboard, incident reporting forms, a student-specific portal, and an automated WhatsApp notification integration to alert parents immediately.

## 2. Complete Folder Structure
Below is the comprehensive folder structure of the project. Note that the presentation file (`(FEDF) presentation.pptx`) has been explicitly excluded from this structural map.

```text
123@123/
├── .env                  # Configuration: Environment variables and API keys
├── .env.example          # Configuration: Example structure for .env variables
├── .gitignore            # Git: Excludes node_modules, .env, and local data
├── Architecture.md       # Markdown: Original architectural overview
├── README.md             # Markdown: Basic project title
├── SBT.md                # Markdown: This comprehensive report
├── work.md               # Markdown: Explains the Incident Sync mechanism
├── package.json          # JSON: Node.js dependencies and run scripts
├── package-lock.json     # JSON: Dependency lockfile
├── server.js             # JavaScript: Main Express server entry point
├── test-flow.js          # JavaScript: End-to-End API test script
├── seed.js               # JavaScript: Script to seed the initial database users
├── data/                 # Directory: Stores active JSON database files
│   ├── incidents.json    # JSON: Stored incident reports
│   ├── notifications.json# JSON: Stored system notifications
│   └── users.json        # JSON: Stored user credentials and roles
├── public/               # Directory: Frontend static files (HTML/CSS/JS)
│   ├── Admin panel.html  # HTML/JS: Interface for managing staff and system settings
│   ├── Dashboard.html    # HTML/JS: High-level overview and statistics
│   ├── Incident history.html # HTML/JS: Logs of all reported incidents
│   ├── Incident report.html  # HTML/JS: Form to submit a new behavioral incident
│   ├── login.html        # HTML/JS: Universal login page for all users
│   └── student-portal.html   # HTML/JS: Restricted view for students to see their incidents
└── server/               # Directory: Backend source code
    ├── db/               # Directory: Database abstraction layer
    │   ├── index.js      # JavaScript: Database connection router and interface
    │   ├── jsonDb.js     # JavaScript: JSON flat-file database implementation
    │   ├── mongoDb.js    # JavaScript: MongoDB database implementation
    │   └── sqliteDb.js   # JavaScript: SQLite database implementation
    ├── routes/           # Directory: Express API Routes
    │   ├── auth.js       # JavaScript: Login, registration, profile updates
    │   ├── incidents.js  # JavaScript: Incident CRUD endpoints
    │   └── notifications.js # JavaScript: Notification endpoints
    └── services/         # Directory: External integrations
        └── whatsapp.js   # JavaScript: WhatsApp Web integration using Puppeteer
```

## 3. Component Breakdown by Language and Purpose

### **JavaScript (Node.js Backend & Scripts)**
The backend is powered by Node.js and the Express.js framework.
* **`server.js`**: The main entry point. Bootstraps the Express server, connects to the database, initializes the WhatsApp service, and registers the API routes (`/api/auth`, `/api/incidents`, `/api/notifications`).
* **`seed.js`**: A utility script used to populate the `data/users.json` file with initial Administrator and Student credentials (`Admin@123`, `Student@123`).
* **`test-flow.js`**: An automated end-to-end integration test that verifies the incident creation, authentication, and data retrieval processes from both Admin and Student perspectives.
* **`server/db/index.js`**: The central database routing file. It checks environment variables to determine whether to connect to MongoDB, SQLite, or fall back to the default local JSON file storage. It exposes a unified API (`users`, `incidents`, `notifications`) for the rest of the application to interact with.
* **`server/db/jsonDb.js`**: Implements the unified database interface by synchronously and asynchronously reading/writing directly to the `.json` files inside the `data/` folder.
* **`server/db/mongoDb.js` & `server/db/sqliteDb.js`**: Advanced database adapters that map the exact same unified interface methods (like `.find()`, `.create()`) to Mongoose schemas or SQLite raw SQL commands.
* **`server/routes/auth.js`**: Handles authentication workflows using JWT. Includes unique logic that automatically intercepts unrecognized student emails during login, generating a fresh student account dynamically.
* **`server/routes/incidents.js`**: Handles the CRUD operations for incidents. Also triggers the `whatsapp.js` service alerting system automatically when a new incident is logged and a parent's number is provided.
* **`server/routes/notifications.js`**: Handles system-level alert messages.
* **`server/services/whatsapp.js`**: Leverages `whatsapp-web.js` and Puppeteer to run a headless WhatsApp Web instance. This script is responsible for generating the initial authentication QR code on server boot and dispatching automated incident alert messages to parents.

### **HTML/CSS/Vanilla JavaScript (Frontend Interfaces)**
The frontend operates without heavy frameworks like React or Angular, opting for clean HTML and embedded Vanilla JS logic.
* **`public/login.html`**: Captures user credentials, submits them to the `/api/auth/login` endpoint, stores the resulting JWT in `localStorage`, and routes the user to the correct dashboard based on their role (`admin` vs `student`).
* **`public/Dashboard.html`**: A high-level overview interface for Admins/Staff. It queries the backend to display recent statistics, quick alerts, and pending tasks.
* **`public/Incident report.html`**: An input form for teachers and administrators to submit a detailed report. On submission, the JavaScript triggers a `POST` request to `/api/incidents`.
* **`public/Incident history.html`**: A detailed, filterable data grid for administrators to look up past incidents by student ID, severity, or date.
* **`public/student-portal.html`**: A specialized, read-only interface mapped directly to a student's ID. When this page loads, the frontend securely requests incidents from the backend, receiving *only* the incidents mapped to that logged-in student.

### **JSON (Configuration & Storage)**
* **`package.json` & `package-lock.json`**: Define the Node.js project metadata, scripts (`npm start`), and the exact versions of dependencies (like `express`, `jsonwebtoken`, `bcryptjs`, and `whatsapp-web.js`).
* **`data/*.json`**: The core local database. Since the backend falls back to `jsonDb.js` by default, all application state (users, incidents, and notifications) is physically persisted here.

### **Markdown (Documentation)**
* **`Architecture.md` & `work.md`**: Legacy documentation explaining the original folder structure, API environment keys, and the intricate logic flow syncing incidents directly to a student's auto-generated portal.
* **`SBT.md`**: This generated report file.

### **Environment Configuration (`.env`)**
* **`.env` & `.env.example`**: Secure storage for variables such as `PORT`, `JWT_SECRET`, the selected database engine `DB_TYPE`, and various API keys (like WhatsApp or generic external services).

## 4. Architectural Workflow

The Student Behavior Tracker relies on a **Client-Server Architecture** augmented by a **Modular Data Access Layer**.

1. **Client Interaction**: 
   A user accesses a static page in `public/` (e.g. `Incident report.html`). They fill out the form. Embedded Vanilla JS intercepts the form submission, attaches the JWT (obtained at login) to the Authorization headers, and makes a standard HTTP `fetch()` request.
   
2. **Express API Routing**:
   The `server.js` file catches the request and routes it to `server/routes/incidents.js`. Middleware (`verifyToken`) steps in first to validate the JWT and extract the user's role and identity.

3. **Data Abstraction Layer**:
   The route file calls `db.incidents.create()`. Because of the `server/db/index.js` abstraction, the route doesn't care whether data is stored in JSON, SQLite, or MongoDB. The active DB module fulfills the request and safely writes to the storage medium.

4. **Background Service Trigger**:
   Immediately after the incident is saved, the route asynchronously dispatches the incident payload to `server/services/whatsapp.js`. The `whatsapp-web.js` headless browser client formats the incident details and sends a direct, unblocked WhatsApp message to the parent's contact number.
