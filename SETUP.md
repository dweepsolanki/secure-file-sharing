# SecureShare Local Setup Instructions

This document provides step-by-step instructions for setting up and running the SecureShare application on your local machine.

## Prerequisites

Before you begin, make sure you have the following installed:

- Node.js (version 16 or higher)
- npm (typically comes with Node.js)
- Git (for cloning the repository)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd secureshare
```

### 2. Install Dependencies

Run the following command to install all the required dependencies:

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# Session Secret (change this to a random string in production)
SESSION_SECRET=your_secure_session_secret

# Optionally, you can specify a custom upload directory
UPLOAD_DIR=./uploads
```

### 4. Start the Development Server

Run the following command to start the development server:

```bash
npm run dev
```

This will start both the frontend (Vite) and backend (Express) servers. The application will be available at `http://localhost:5000`.

## Security Configuration

### Encryption Keys

When you first start the application, you'll need to generate encryption keys:

1. Log in as an administrator (default admin credentials: admin/admin123)
2. Navigate to the "Security" page
3. Click "Generate New Key" to create both AES and Quantum keys
4. Make sure to set the appropriate key as active

### Role-Based Access Control

The application has the following user roles:

- **Admin**: Full access to all features, including user management, security settings, and audit logs
- **User**: Standard access to file upload, download, and sharing features

To change a user's role:

1. Log in as an administrator
2. Navigate to the "Users" page
3. Click the edit button next to a user
4. Change their role to the desired level

## Using the Application

### File Encryption

SecureShare supports three encryption methods:

1. **AES-256-CBC**: Fast and secure encryption suitable for most files
2. **Kyber768 (Quantum-resistant)**: Post-quantum encryption for highly sensitive files
3. **Dual Encryption**: Combines both methods for maximum security

### Security Recommendations

For best security practices:

1. Rotate encryption keys regularly (recommended: every 90 days)
2. Enable "Enforce Quantum Encryption for Sensitive Files" in Security Settings
3. Use strong passwords for all accounts
4. Regularly review audit logs for suspicious activity

## Troubleshooting

### Common Issues

#### Quantum Key Missing

If you encounter errors about missing quantum keys:

1. Go to the "Keys" page
2. Check if there's an active quantum key
3. If not, generate a new quantum key and set it as active

#### File Download Failures

If file downloads fail:

1. Ensure you have the appropriate encryption keys active
2. Check that the file hasn't been corrupted
3. Verify you have permission to access the file

#### Permission Errors

If you receive "Access Denied" messages:

1. Verify you're logged in with the correct account
2. Check that you have the necessary permissions for the operation
3. For admin functions, ensure your account has admin privileges

## Contributing

Please refer to the CONTRIBUTING.md file for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.