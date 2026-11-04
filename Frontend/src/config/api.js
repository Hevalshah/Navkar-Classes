const developmentApiUrl = process.env.NODE_ENV === "development"
  ? "http://" + window.location.hostname + ":5000"
  : "";

export const API_BASE_URL = (process.env.REACT_APP_API_URL || developmentApiUrl).replace(/\/$/, "");
