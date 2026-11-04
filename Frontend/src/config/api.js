const developmentApiUrl = process.env.NODE_ENV === "development"
  ? "http://" + window.location.hostname + ":5000"
  : "";

export const API_BASE_URL = (process.env.REACT_APP_API_URL || developmentApiUrl).replace(/\/$/, "");

export const openAuthenticatedFile = async (url) => {
  const tab = window.open("about:blank", "_blank");
  if (!tab) throw new Error("Allow pop-ups to open this file.");
  tab.opener = null;
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Please sign in to view this file.");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Unable to open this file.");
    const objectUrl = URL.createObjectURL(await response.blob());
    tab.location.replace(objectUrl);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (error) {
    tab.close();
    throw error;
  }
};
