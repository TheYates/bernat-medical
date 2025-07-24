# Medical Clinic Management System

A full-stack web application for managing medical clinic operations, including patient records, prescriptions, appointments, and pharmacy services.

## Project Structure

The project consists of two main parts:

### Frontend

- Built with React, TypeScript, and Vite
- UI components from Radix UI and Shadcn
- Styling with Tailwind CSS
- State management with React Query and Context API
- Form handling with React Hook Form and Zod

### Backend

- Node.js with Express
- TypeScript
- MySQL database
- JWT authentication
- File uploads with Multer

## Prerequisites

- Node.js (v16+)
- pnpm (preferred) or npm
- MySQL database

## Installation

### Clone the repository

```bash
git clone <repository-url>
cd medical
```

### Backend Setup

```bash
cd backend
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and other settings
```

Update the `.env` file with your database configuration:

```
PORT=5000
HOST=0.0.0.0
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your-password
DB_NAME=bmed
JWT_SECRET=your-secret-key
UPLOAD_PATH=uploads
CORS_ORIGIN=http://localhost:5173
```

Create the database:

```bash
# Connect to your MySQL server
mysql -u root -p

# Inside MySQL
CREATE DATABASE bmed;
```

Create an admin user:

```bash
pnpm run create-admin
```

### Frontend Setup

```bash
cd frontend
pnpm install

# Configure environment variables
cp .env.example .env
```

Update the `.env` file with your backend API URL:

```
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Development Mode

#### Backend

```bash
cd backend
pnpm run dev
```

#### Frontend

```bash
cd frontend
pnpm run dev
```

#### Run both simultaneously

```bash
cd frontend
pnpm run dev:all
```

### Production Mode

#### Backend

```bash
cd backend
pnpm run build
pnpm start
```

#### Frontend

```bash
cd frontend
pnpm run build
# Serve the built files using a web server like Nginx
```

## Features

- User authentication (login/logout)
- Role-based access control (admin, doctor, nurse, receptionist)
- Patient management
- Appointment scheduling
- Prescription management
- Pharmacy service
- File uploads (medical reports, images)
- Responsive UI design

## API Endpoints

The backend provides RESTful API endpoints:

- `/api/auth` - Authentication routes
- `/api/users` - User management
- `/api/patients` - Patient management
- `/api/prescriptions` - Prescription management
- `/api/services` - Medical services
- `/api/pharmacy` - Pharmacy management

## Technologies Used

### Frontend

- React
- TypeScript
- Vite
- React Router
- React Query
- React Hook Form
- Zod (validation)
- Shadcn UI components
- Tailwind CSS
- Axios

### Backend

- Node.js
- Express
- TypeScript
- MySQL
- JWT (authentication)
- Bcrypt (password hashing)
- Multer (file uploads)

## License

[MIT](LICENSE)
