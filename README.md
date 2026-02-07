# Local Screen Share - Broadcast App

A WebRTC-based screen sharing application that allows broadcasters to stream their screen to multiple viewers in real-time with low latency.

## Features

-   **Zero Install**: Works directly in the browser.
-   **Low Latency**: Powered by WebRTC for real-time streaming.
-   **Room Selection**: Choose from predefined rooms (Big Church, Small Church, Hall).
-   **Broadcaster Auth**: Secure streaming with a pre-shared passkey.
-   **Viewer Access**: Simple, direct join for viewers.
-   **Firebase Backend**: Uses Firestore for signaling and presence.

## Tech Stack

-   **Frontend**: React, TensorFlow (Vite), TailwindCSS
-   **Real-time Communication**: WebRTC
-   **Signaling & Auth**: Firebase (Firestore)
-   **Deployment**: Firebase Hosting via GitHub Actions

## Setup & Development

### Prerequisites

-   Node.js (v18+)
-   Yarn
-   Firebase Project

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd broadcast-app
    ```

2.  Install dependencies:
    ```bash
    yarn install
    ```

3.  Create a `.env` file in the root directory based on `.env.example`:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    VITE_BROADCASTER_PASSKEY=your_secure_passkey
    ```

4.  Start the development server:
    ```bash
    yarn dev
    ```

## Deployment

The project is configured for automated deployment to Firebase Hosting using GitHub Actions.

### Deployment Setup

1.  **Firebase Token**: You need a `FIREBASE_SERVICE_ACCOUNT_LOCAL_SCREEN_SHARE` secret in your GitHub repository.
    -   Generate this by running `firebase init hosting:github` or downloading a service account JSON from the Google Cloud Console.
    -   Add the JSON content as a repository secret named `FIREBASE_SERVICE_ACCOUNT_LOCAL_SCREEN_SHARE`.

2.  **Environment Variables**: Add the following secrets to your GitHub repository so they are injected during the build:
    -   `VITE_FIREBASE_API_KEY`
    -   `VITE_FIREBASE_AUTH_DOMAIN`
    -   `VITE_FIREBASE_PROJECT_ID`
    -   `VITE_FIREBASE_STORAGE_BUCKET`
    -   `VITE_FIREBASE_MESSAGING_SENDER_ID`
    -   `VITE_FIREBASE_APP_ID`
    -   `VITE_BROADCASTER_PASSKEY`

3.  **Deploy**: Push changes to the `main` branch to trigger the deployment workflow.
