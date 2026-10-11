# Expense Voucher Management System

A web application that digitises ABC Company's expense reimbursement process. Employees create and submit expense vouchers, the Director approves or rejects them with a signature or a reason, and the Accounts Team monitors approved vouchers for payment.

## Features

- JWT login with three roles: **Employee**, **Director**, **Accounts**
- Role-based access enforced in the backend and in the frontend routes
- Employees: create, save as draft, edit, delete (drafts only), submit, upload signature, track status
- Director: pending approvals, approve (signature required), reject (reason required)
- Accounts: read-only view of all submitted vouchers, with both signatures
- Search, filter and sort (voucher number, employee name, department, category, status, date range, amount range)
- Dashboards for each role
- Auto-generated unique voucher numbers (e.g. `EV-2026-0001`)
- Signature image upload (PNG/JPG, max 2 MB)
- Print / save as PDF for Director and Accounts
- Responsive layout

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Axios, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MySQL (via `mysql2`) |
| Auth | JWT (`jsonwebtoken`), password hashing with `bcrypt` |
| File upload | Multer |

## Project Structure

```
expense-voucher-system/
├── backend/
│   ├── database/schema.sql      # database schema
│   ├── middleware/
│   │   ├── auth.js              # authenticate + authorize (role check)
│   │   └── upload.js            # multer config for signature images
│   ├── routes/
│   │   ├── auth.js              # login, current user
│   │   ├── vouchers.js          # voucher CRUD + workflow
│   │   └── dashboard.js         # dashboard statistics
│   ├── db.js                    # MySQL connection pool
│   ├── seed.js                  # creates test users
│   ├── server.js                # app entry point
│   └── .env.example
└── frontend/
    └── src/
        ├── components/          # Layout, ProtectedRoute, StatusBadge, DirectorActions
        ├── context/             # AuthContext
        ├── pages/               # Login, Dashboard, MyVouchers, VoucherForm, VoucherDetails, AllVouchers
        ├── api.js               # Axios instance with token interceptor
        └── utils.js             # helpers and constants
```

## Setup Instructions

### Prerequisites

- Node.js 18 or newer
- MySQL 8 or newer
- Git

### 1. Clone the repository

```
git clone https://github.com/aaryak21/expense-voucher-system.git
cd expense-voucher-system
```

### 2. Backend

```
cd backend
npm install
```

Create a `.env` file by copying `.env.example`, then fill in your MySQL password and a long random `JWT_SECRET`:

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=expense_voucher_db
JWT_SECRET=your_jwt_secret
```

### 3. Create the database

Run the schema file with MySQL (or open it in MySQL Workbench and execute it):

```
mysql -u root -p < database/schema.sql
```

### 4. Seed the test users

```
node seed.js
```

### 5. Start the backend

```
npm run dev
```

The API runs at `http://localhost:5000`. Check `http://localhost:5000/api/health`; it should return `{"status":"ok","database":"connected"}`.

The `uploads/` folder for signature images is created automatically on first run.

### 6. Frontend

Open a second terminal:

```
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

> The frontend expects the API at `http://localhost:5000`. If you change the backend port, update `baseURL` in `frontend/src/api.js` and `FILE_URL` in `frontend/src/utils.js`.

## Test Accounts

All accounts use the password `password123`.

| Role | Email |
|---|---|
| Employee | employee@abc.com |
| Employee (second) | employee2@abc.com |
| Director | director@abc.com |
| Accounts | accounts@abc.com |

A second employee is included so you can verify that employees cannot see each other's vouchers.

## Database Schema

The full SQL is in `backend/database/schema.sql`.

### `users`

| Column | Type | Notes |
|---|---|---|
| id | INT, PK, auto-increment | |
| name | VARCHAR(100) | |
| email | VARCHAR(150) | unique, used to log in |
| password_hash | VARCHAR(255) | bcrypt hash, never plain text |
| role | ENUM('employee','director','accounts') | |
| employee_code | VARCHAR(30), nullable | optional Employee ID |
| created_at | TIMESTAMP | |

### `vouchers`

| Column | Type | Notes |
|---|---|---|
| id | INT, PK, auto-increment | |
| voucher_number | VARCHAR(30), unique | generated automatically, e.g. `EV-2026-0001` |
| user_id | INT, FK to users.id | the employee who created it |
| voucher_date | DATE | set to the creation date |
| expense_date | DATE, nullable | required at submission |
| department | VARCHAR(100), nullable | required at submission |
| expense_title | VARCHAR(200), nullable | required at submission |
| expense_category | VARCHAR(50), nullable | |
| expense_description | TEXT, nullable | |
| amount | DECIMAL(10,2), nullable | must be greater than 0 |
| status | ENUM('draft','pending','approved','rejected') | default `draft` |
| employee_signature | VARCHAR(255), nullable | file path of the uploaded image |
| director_signature | VARCHAR(255), nullable | file path of the uploaded image |
| approved_by | INT, FK to users.id, nullable | director who approved or rejected |
| approval_date | DATETIME, nullable | when the decision was made |
| rejection_reason | TEXT, nullable | set when rejected |
| created_at | TIMESTAMP | audit |
| updated_at | TIMESTAMP | audit, updates automatically |

Design notes:

- Most voucher columns are nullable so that a **draft** can be saved incomplete. The required-field rules are enforced when the voucher is **submitted**.
- `amount` is `DECIMAL`, not `FLOAT`, to avoid rounding errors with money.
- `ENUM` columns restrict `role` and `status` to valid values.
- Only the **file path** of a signature is stored in the database; the image itself is stored in `backend/uploads/`.

## Voucher Workflow

```
Draft  --submit-->  Pending Approval  --approve-->  Approved
                          |
                          +---reject--->  Rejected (reason visible to employee)
```

## API Documentation

Base URL: `http://localhost:5000/api`

All routes except login require the header `Authorization: Bearer <token>`.

Error responses use the form `{ "message": "..." }` with these status codes: `400` validation or rule violation, `401` missing or invalid token, `403` role not allowed, `404` not found, `500` server error.

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | public | Body (JSON): `email`, `password`. Returns `{ token, user }` |
| GET | `/auth/me` | any logged-in user | Returns the current user's profile |

### Vouchers

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/vouchers` | employee | Create a draft. `multipart/form-data` with `department`, `expense_title`, `expense_category`, `expense_date`, `expense_description`, `amount`, and optional file `employee_signature` |
| GET | `/vouchers` | all roles | List vouchers. Employees get their own (including drafts); Director and Accounts get all non-draft vouchers |
| GET | `/vouchers/:id` | all roles | Voucher details. Same visibility rule as the list; otherwise `404` |
| PUT | `/vouchers/:id` | employee (owner) | Edit a draft. Same fields as create. Only while status is `draft` |
| DELETE | `/vouchers/:id` | employee (owner) | Delete a draft. Only while status is `draft` |
| POST | `/vouchers/:id/submit` | employee (owner) | Draft to pending. Validates department, title, expense date, amount > 0 and employee signature |
| POST | `/vouchers/:id/approve` | director | Pending to approved. `multipart/form-data` with required file `director_signature` |
| POST | `/vouchers/:id/reject` | director | Pending to rejected. JSON body: `reason` (required) |

#### List query parameters (`GET /vouchers`)

| Parameter | Meaning |
|---|---|
| `search` | matches voucher number or employee name (partial match) |
| `status` | `draft`, `pending`, `approved` or `rejected` |
| `department` | exact department |
| `category` | exact expense category |
| `from`, `to` | expense date range (`YYYY-MM-DD`) |
| `minAmount`, `maxAmount` | amount range |
| `sortBy` | `created_at`, `expense_date`, `amount`, `voucher_number`, `status`, `employee_name` |
| `order` | `asc` or `desc` (default `desc`) |

Example: `GET /vouchers?status=pending&department=Sales&minAmount=1000&sortBy=amount&order=desc`

### Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/dashboard` | all roles | Returns statistics for the logged-in user's role (see below) |

- **Employee:** total, draft, pending, approved, rejected, total amount claimed
- **Director:** pending count, approved today, rejected today, total pending amount, recent activity
- **Accounts:** total, pending, approved, rejected, total approved amount, recent approved vouchers

### Other

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Checks that the server and database connection are working |
| GET | `/uploads/<file>` | Serves uploaded signature images (outside the `/api` prefix) |

## Validation and Business Rules

Enforced in the backend (and mirrored in the frontend forms):

- Department, expense title, expense date and amount are mandatory at submission
- Amount must be greater than zero
- Employee signature is mandatory before submission
- Director signature is mandatory before approval
- Rejection reason is mandatory when rejecting
- Voucher numbers are unique and generated automatically
- New vouchers start as Draft
- Employees can edit or delete only their own **draft** vouchers
- Submitted, approved and rejected vouchers are read-only for employees
- Only the Director can approve or reject, and only pending vouchers
- Employees see only their own vouchers; Director and Accounts see every submitted voucher
- Accounts has read-only access
- Uploads are limited to PNG or JPG images up to 2 MB

## Security Notes

- Passwords are hashed with bcrypt
- Authorisation is checked on the server for every request using the role stored in the signed JWT
- All SQL uses parameterised queries; sort columns come from a fixed whitelist
- Login errors do not reveal whether an email exists
- Employees requesting another employee's voucher receive `404`, so the voucher's existence is not revealed
- `.env` and `uploads/` are excluded from Git

## Assumptions

1. **"Submitted" and "Pending Approval" are one status.** The moment an employee submits, the voucher is waiting for the Director, so a single `pending` status is used.
2. **Drafts are private.** Director and Accounts see "all vouchers" meaning all submitted vouchers; drafts are visible only to the employee who owns them. Removing the `status <> 'draft'` conditions in `routes/vouchers.js` would show drafts to them too.
3. **Required fields are checked at submission, not when saving a draft**, so work in progress can be saved. The amount must still be greater than zero if one is entered.
4. **Voucher number format** is `EV-<year>-<4-digit database id>`.
5. **Voucher date** is set automatically to the creation date.
6. **Departments and categories** come from fixed lists in `frontend/src/utils.js`.
7. **User accounts are pre-created** by `seed.js`. Registration and password reset are outside the assignment scope.
8. **Employee ID** is optional and stored in `users.employee_code`.
9. **Dashboards:** "Total Amount Claimed" counts submitted vouchers (pending, approved, rejected) but not drafts. "Today" uses the MySQL server's date.
10. **Signatures** are uploaded images stored on the server's disk; their paths are stored in the database.
11. **Print/Download** is done through the browser's print dialog (which can also save as PDF).
12. **A rejected voucher is final.** The employee can view the reason but cannot edit and resubmit it; they create a new voucher instead.

## Screenshots

Add screenshots to a `screenshots/` folder and link them here.

## Possible Future Improvements

- Resubmission of rejected vouchers
- Email notifications on approval or rejection
- Receipt attachments
- Automated tests and Docker setup