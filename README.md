# Project COEN6311

COEN 6311 – Software Engineering (Winter 2026)
Concordia University

CUFitness
CUFitness is a web-based fitness and gym management platform designed specifically for the Concordia University community. The system improves coordination between students, coaches, and gym facilities while supporting personalized fitness planning, transparent booking policies, and privacy-focused user management.
The platform is built following modern software engineering practices using a Django backend, REST API architecture, and a separate frontend application.

Project Objectives
CUFitness aims to:
Provide structured workout assignment and tracking
Improve coordination between students and coaches
Increase transparency in booking and gym policies
Support personalized fitness goals and dietary restrictions
Integrate a conversational assistant for gym-related FAQs
Ensure strong privacy and data protection controls

System Architecture
CUFitness follows a client–server architecture:
Frontend (React / Web Client)
⬇
Django REST API Backend
⬇
Database (SQLite/PostgreSQL)
The backend exposes RESTful endpoints and uses JWT authentication for secure access control.

Installation & Setup
Prerequisites:

1. Install Python
2. Install Node.js
3. Clone the repository

Frontend:

1. Open root folder in Command Prompt
2. Change Directory into frontend
3. type npm install
4. To run the frontend app type: 'npm run dev'

Backend:

1. Open root folder in Command Prompt
2. Change Directory into backend
3. Create a virtual environment named venv
4. Activate it (You should see (venv) to the left of your current directory in command prompt)
5. Use pip to install the needed libraries in the requirements.txt file, 'pip install -r requirements.txt'
6. Type 'python manage.py migrate' in command prompt to create the tables in the sqlite3 db file
7. To run the backend app type: 'python manage.py runserver' --> You need to be inside your virtual environment

VSCode:

1. Open the project in VS Code and install the recommended extensions when prompted, or go to the Extensions panel, filter by **Recommended**, and install them all.

Long-Term Vision
CUFitness is designed to be scalable beyond Concordia University and adaptable to other university gym environments. Future improvements include advanced analytics, AI-powered recommendations, and enhanced scheduling intelligence.

Team Name: ByteForge
Members:
-IRFANUL ISLAM
-FAROUK IHDENE
-ALI ALHADI AKHRAS
-FARAH ZAGHDANE
