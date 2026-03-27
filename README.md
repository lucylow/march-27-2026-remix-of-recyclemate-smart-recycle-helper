
# RecycleMate – AI‑Powered Waste Sorting Assistant

<p align="center">
  <img src="assets/logo.png" alt="RecycleMate Logo" width="200"/>
</p>

<p align="center">
  <strong>Scan. Learn. Act.</strong><br />
  An intelligent mobile application that helps you recycle right, every time.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-documentation">API Docs</a> •
  <a href="#ai-model">AI Model</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## 📖 Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [System Overview](#system-overview)
  - [Data Flow](#data-flow)
  - [Component Diagram](#component-diagram)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Backend API Documentation](#backend-api-documentation)
  - [Endpoints](#endpoints)
  - [Request/Response Examples](#requestresponse-examples)
- [Frontend Details](#frontend-details)
  - [Screens](#screens)
  - [Navigation](#navigation)
  - [State Management](#state-management)
- [AI Model](#ai-model)
  - [Dataset](#dataset)
  - [Training](#training)
  - [On‑Device Inference](#ondevice-inference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## 🌟 About the Project

**RecycleMate** was born out of the **2030 AI Challenge** – a hackathon focused on building AI‑powered solutions for the UN Sustainable Development Goals. It addresses **SDG 12: Responsible Consumption and Production** by tackling the global problem of waste contamination in recycling streams.

Every day, millions of people place non‑recyclable items into recycling bins – a phenomenon known as “wishcycling”. This contaminates entire batches of recyclables, sending them to landfills instead. RecycleMate empowers individuals with instant, accurate disposal instructions simply by pointing their phone camera at an item.

The app uses a lightweight **computer vision model** running **on‑device** to detect waste items, then queries a **localised database** (via a REST API) to provide disposal rules based on the user’s GPS location. Gamification elements (points, streaks, achievements) encourage long‑term engagement and positive behaviour change.

---

## ✨ Features

- **Real‑time Object Detection** – Identify multiple waste items simultaneously using the phone’s camera.
- **Localised Recycling Rules** – GPS‑based lookup of disposal instructions for the user’s municipality.
- **On‑Device AI** – Privacy‑first, no internet required for detection; works offline.
- **Gamification** – Earn points, maintain streaks, and unlock achievements.
- **Scan History** – Review past scans and track your recycling activity.
- **Environmental Impact Dashboard** – Visualise CO₂ saved, trees equivalent, water conserved.
- **Intuitive UI** – Smooth animations, haptic feedback, and dark mode support (optional).
- **Multi‑Page Navigation** – Side drawer menu for quick access to History, Impact, Settings, Help, and About.

---

## 🛠 Tech Stack

| Area          | Technology                                                                 |
|---------------|----------------------------------------------------------------------------|
| **Frontend**  | React Native (Expo), React Navigation, Reanimated 2, AsyncStorage, Axios   |
| **Backend**   | FastAPI (Python), SQLAlchemy, PostgreSQL/PostGIS, Pydantic                 |
| **AI/ML**     | TensorFlow 2, TensorFlow Lite, MobileNetV2 SSD, COCO dataset + custom data |
| **DevOps**    | Docker, Docker Compose, GitHub Actions (CI/CD)                             |
| **Testing**   | Jest (unit), Detox (E2E), Postman (API)                                    |

---

## 🏗 Architecture

### System Overview

The following diagram illustrates the high‑level architecture of RecycleMate:

```mermaid
graph TB
    subgraph Mobile App
        A[React Native UI] --> B[Camera & Gallery]
        B --> C[TFLite Object Detector]
        C --> D[Detection Results]
        D --> E[API Client]
        E --> F[Gamification Engine]
    end

    subgraph Backend
        G[FastAPI Server] --> H[Location Service]
        H --> I[PostGIS Database]
        G --> J[Recycling Rules API]
        J --> I
    end

    subgraph External
        K[Municipal Data Sources]
    end

    E --> G
    I --> K
    F --> L[Local Storage]
```

### Data Flow

The sequence of operations when a user scans an item:

```mermaid
sequenceDiagram
    participant User
    participant Camera
    participant TFLite
    participant API
    participant Database

    User->>Camera: Open app & point camera
    Camera->>TFLite: Capture image
    TFLite-->>Camera: Detected objects (labels + bounding boxes)
    Camera->>API: Send labels + GPS coordinates
    API->>Database: Query location polygon
    Database-->>API: Location ID
    API->>Database: Fetch recycling rules for that location & items
    Database-->>API: Disposal instructions
    API-->>Camera: Return instructions
    Camera-->>User: Display instructions + award points
```

### Component Diagram

```mermaid
classDiagram
    class CameraScreen {
        +cameraRef
        +detections[]
        +captureImage()
        +toggleTorch()
        +pickFromGallery()
    }
    class ResultsScreen {
        +instructions[]
        +confirmDisposal()
    }
    class ProfileScreen {
        +points
        +streak
        +achievements[]
    }
    class HistoryScreen {
        +scanHistory[]
    }
    class ImpactScreen {
        +stats
    }
    class ApiService {
        +getDisposalInstructions()
        +postUserStats()
    }
    class TFLiteService {
        +loadModel()
        +runInference(image)
    }
    class UserContext {
        +points
        +streak
        +achievements
        +addPoints()
        +incrementStreak()
    }

    CameraScreen --> TFLiteService : uses
    CameraScreen --> ApiService : sends detections
    ResultsScreen --> ApiService : (optional) confirm
    ResultsScreen --> UserContext : updates points
    ProfileScreen --> UserContext : reads stats
    HistoryScreen --> ApiService : fetches history
```

---

## 📁 Project Structure

```
recyclemate/
├── .expo/
├── assets/
│   ├── fonts/
│   ├── images/
│   ├── model/                  # TFLite model & labels
│   └── onboarding/              # Onboarding images
├── src/
│   ├── components/
│   │   ├── BoundingBox.js
│   │   ├── AchievementBadge.js
│   │   ├── LoadingIndicator.js
│   │   └── ToastConfig.js
│   ├── context/
│   │   └── UserContext.js
│   ├── navigation/
│   │   ├── AppNavigator.js       # Bottom tab navigator
│   │   ├── DrawerNavigator.js    # Side drawer
│   │   └── CustomDrawerContent.js
│   ├── screens/
│   │   ├── OnboardingScreen.js
│   │   ├── CameraScreen.js
│   │   ├── ResultsScreen.js
│   │   ├── ProfileScreen.js
│   │   ├── HistoryScreen.js
│   │   ├── ImpactScreen.js
│   │   ├── SettingsScreen.js
│   │   ├── HelpScreen.js
│   │   └── AboutScreen.js
│   ├── services/
│   │   ├── api.js
│   │   └── tflite.js
│   └── utils/
│       ├── permissions.js
│       └── helpers.js
├── App.js
├── app.json
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Python 3.9+ (for backend)
- PostgreSQL with PostGIS extension
- Docker (optional, for containerised backend)

### Installation

#### Frontend

```bash
git clone https://github.com/your-username/recyclemate.git
cd recyclemate
npm install
```

Place your trained TFLite model (`model.tflite`) and label map in `assets/model/`.

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Create a `.env` file:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/recyclemate
DEBUG=True
```

Set up the database:

```bash
createdb recyclemate
psql -d recyclemate -c "CREATE EXTENSION postgis;"
python scripts/seed_data.py
```

### Running the App

#### Frontend (Expo)

```bash
expo start
# Scan QR code with Expo Go app on your phone
```

#### Backend (FastAPI)

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

#### Docker (Backend)

```bash
docker-compose up --build
```

---

## 📡 Backend API Documentation

### Endpoints

#### `POST /api/get-disposal-instructions`

Retrieves disposal instructions for detected objects based on user location.

**Request Body:**

```json
{
  "latitude": 42.3,
  "longitude": -93.0,
  "objects": [
    {"label": "plastic_bottle", "confidence": 0.95},
    {"label": "plastic_bag", "confidence": 0.88}
  ],
  "user_id": "optional-user-id"
}
```

**Response:**

```json
{
  "instructions": [
    {
      "item": "plastic_bottle",
      "instruction": "Rinse and place in blue recycling bin.",
      "bin": "Recycling",
      "dropoff": null
    },
    {
      "item": "plastic_bag",
      "instruction": "Not recyclable curbside. Return to grocery store drop-off.",
      "bin": "Drop-off",
      "dropoff": "Local grocery stores"
    }
  ]
}
```

#### `POST /api/user/stats` (optional)

Update user points, streak, etc.

---

## 📱 Frontend Details

### Screens

| Screen          | Description                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| Onboarding      | Three‑slide introduction for first‑time users.                             |
| Camera          | Live camera feed with bounding box overlay, torch toggle, gallery picker.  |
| Results         | Displays disposal instructions per detected item, with confirm button.     |
| Profile         | Shows total points, current streak, and achievement badges.                |
| History         | List of past scans with dates and points earned.                           |
| Impact          | Environmental metrics (CO₂ saved, trees equivalent, water saved).          |
| Settings        | App preferences (notifications, dark mode, etc.).                          |
| Help            | FAQ and contact information.                                               |
| About           | App version, credits, and links.                                           |

### Navigation

The app uses a **drawer navigator** as the root, containing a **bottom tab navigator** for the main screens (Scan, Profile) and additional screens (History, Impact, etc.) accessible via the drawer. The drawer can be opened by tapping the menu icon in the header or swiping from the left edge.

### State Management

Global user state (points, streak, achievements) is managed via React Context (`UserContext`). Local UI state uses React hooks (`useState`, `useEffect`).

---

## 🧠 AI Model

### Dataset

We combined several public datasets to create a robust waste detection dataset:

- **Multi‑Object Solid Waste Material Image Dataset** (IEEE DataPort)
- **UGV‑NBWASTE** (Mendeley Data)
- **TACO (Trash Annotations in Context)**
- Custom images collected locally

Total images: ~8,500 across 12 classes (plastic bottle, aluminum can, newspaper, cardboard, plastic bag, styrofoam, glass bottle, food waste, etc.)

### Training

We used the **TensorFlow Object Detection API** with a pre‑trained **SSD MobileNet V2 FPNLite 320x320** checkpoint. Training was performed on Google Colab with GPU acceleration for 20,000 steps.

Key training parameters:

- Batch size: 16
- Optimizer: Momentum (0.9)
- Learning rate: Cosine decay from 0.04
- Data augmentation: random horizontal flip, brightness, contrast

The final model achieved **mAP@0.5: 0.82** on the validation set.

### On‑Device Inference

The trained model was converted to **TensorFlow Lite** with float16 quantization, reducing size from 20 MB to ~6 MB while maintaining >95% accuracy. Inference runs at ~30ms per frame on modern smartphones using the `react-native-fast-tflite` native module.

---

## 🧪 Testing

- **Unit Tests**: Jest for React components and utility functions.
- **Integration Tests**: Detox for end‑to‑end scenarios (scanning flow, navigation).
- **API Tests**: Postman collection with automated tests.

Run tests:

```bash
npm test                 # unit tests
npm run e2e              # Detox (requires emulator)
```

---

## 🚢 Deployment

### Frontend

The Expo app can be built for production using:

```bash
expo build:android
expo build:ios
```

### Backend

Deploy the FastAPI backend using a service like **Render**, **Heroku**, or **AWS ECS**. Ensure the database is publicly accessible and the `DATABASE_URL` environment variable is set.

Docker image:

```bash
docker build -t recyclemate-backend .
docker push your-registry/recyclemate-backend
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

Please ensure your code adheres to the existing style and includes tests where appropriate.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgments

- **Featherless.ai** for providing inference credits and API access.
- **Girls In Code SEA** for organising the 2030 AI Challenge.
- **Apple Distinguished Educators** for the recognition certificates.
- All dataset providers: IEEE DataPort, Mendeley Data, TACO.
- The open‑source community for TensorFlow, React Native, FastAPI, and countless other libraries.

---

<p align="center">
  Made with 🌱 for a cleaner planet.
</p>

