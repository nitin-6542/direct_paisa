## Packages
recharts | Dashboard analytics charts and data visualization
date-fns | Human-readable date formatting
leaflet | Map rendering for live location tracking
react-leaflet | React wrapper for Leaflet maps
@types/leaflet | TypeScript definitions for Leaflet
framer-motion | Smooth page transitions and animations

## Notes
- App uses JWT authentication storing token in localStorage. All API requests must include `Authorization: Bearer <token>`
- Leaflet requires its CSS to be imported globally
- React-Leaflet requires specific marker icon handling in React environments
- Geolocation API used for attendance check-ins and live tracking
