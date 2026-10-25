# NSP Labs - Sample Assigner & Route Dispatcher 🦐🚚

An intelligent sample routing and dispatching system built for aquaculture prawn/shrimp testing laboratories (NSP Labs, Bhimavaram delta).

Designed for lab coordinators to rapidly find the nearest sampler, dynamically track samplers across harvesting ponds, calculate optimal multi-sample routes, and dispatch formatted WhatsApp messages to company groups with one click.

---

## 🌟 Key Features

### 1. 🗺️ Full Interactive Google Maps
* **Live Sampler Locations**: Shows pins for all samplers (e.g. Ramesh, Suresh, Naidu) starting from their home towns (Bhimavaram, Narasapuram, Palakol).
* **Dynamic Location Tracking**: When a sampler is assigned to a pond (e.g. Mogalthuru), their marker and reference location dynamically updates to that pond for all subsequent proximity calculations.
* **Pond Harvest Pins & Routes**: Visualizes pending ponds, assigned ponds, and route connection lines from sampler to pond.

### 2. 📋 Smart WhatsApp Message Parser (Paste & Auto-Fill)
Simply paste the raw SMS or WhatsApp message from harvesting companies:
```text
Harvest date 26/10/26
Gnr
90c-2tons
255+
Kuppanapudi
+919014747367
```
The app automatically extracts:
* **Harvest Date** (`26/10/26`)
* **Lot/Code** (`Gnr`)
* **Count & Tonnage** (`90c-2tons`)
* **Specs** (`255+`)
* **Location** (`Kuppanapudi`)
* **Owner Phone** (`+919014747367`) with a 1-tap **"Call Owner"** button.

### 3. 📍 Flexible Location Inputs
* Village/Town name input with instant regional aquaculture coordinates lookup.
* Google Maps link parser (supports `https://maps.app.goo.gl/...`, `goo.gl/maps/...`, and lat,lng coordinates).
* Interactive map click to drop pins anywhere.
* Sub-location / landmark field (e.g. `(konalapalli)`, `(sesali)`).

### 4. 🧭 Intelligent Nearest Sampler Recommendation
* Ranks samplers by driving distance (km) and estimated travel time from their current location.
* Highlights the closest sampler with a **★ Nearest** badge.
* Displays distance comparison cards for quick decision making.

### 5. 📲 1-Click WhatsApp Dispatch Generation
Generates the exact formatted WhatsApp dispatch message:
```text
@Ramesh 
*Sigma sea foods*
Gnr
90c-2tons
Kuppanapudi,(konalapalli)
+919014747367
Madhu 9032259499
```
* **"Send via WhatsApp"** button: Opens WhatsApp directly with the text pre-filled for company groups.
* **"Copy Text"** button: Copies formatted message to clipboard.

### 6. ⚡ Batch Multi-Sample Route Optimizer (TSP / VRP)
* Paste 4–6 messages at once (e.g., *Narasapuram, Mogalthuru, Vempa, Bhimavaram, Undi*).
* Automatically solves the optimal multi-sampler route chains (e.g., Sampler 1 covers `Narasapuram ➔ Mogalthuru ➔ Vempa`; Sampler 2 covers `Bhimavaram ➔ Undi`).
* Minimizes total travel distance and driving time for all samplers.

### 7. 👥 Sampler & Company Management
* Update any sampler's location manually anytime (quick pick regional hubs or custom names).
* **"Reset All to Home Bases"** button at the start of each morning.
* Add/edit samplers and harvesting companies (e.g. *Sigma sea foods*, *Devi Sea Foods*, etc.).

---

## 🚀 Running the App

### Prerequisites
* Node.js (v18+)
* npm

### Quick Start
```bash
# Clone the repository
git clone https://github.com/surendra2304/nsp-labs-sample-assigner.git
cd nsp-labs-sample-assigner

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📱 Android App (PWA & Native APK)

### Method 1: Progressive Web App (PWA) - Instant on Android
1. Open the web app on Chrome on your Android phone.
2. Tap the Chrome three-dot menu `⋮` and select **"Add to Home Screen"** or **"Install app"**.
3. It installs an icon named **"NSP Assigner"** on the phone home screen and runs full-screen like a native Android app!

### Method 2: Native Android APK (Capacitor)
This project is pre-configured with Capacitor:
```bash
# 1. Build the web dist
npm run build

# 2. Add Android platform (requires Android Studio)
npx cap add android

# 3. Open in Android Studio to build APK
npx cap open android
```

---

## ⚙️ Configuration

* **Google Maps API Key**: Configured in `.env` as `VITE_GOOGLE_MAPS_API_KEY` or editable in the app settings modal anytime.
* Local storage preserves all samplers, companies, and assignments locally on your father's phone or computer.

---

## 📄 License
Private & Proprietary - NSP Labs
