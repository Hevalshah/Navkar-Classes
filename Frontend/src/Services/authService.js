export const registerUser = async (data) => {
  const res = await fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Registration failed");
  }
  return res.json();
};

export const registerStudent = async (data, token) => {
  const res = await fetch("http://localhost:5000/api/auth/register-student", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Student registration failed");
  }
  return res.json();
};

export const getProfile = async (token) => {
  const res = await fetch("http://localhost:5000/api/auth/me", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) throw new Error("Failed to fetch profile");
  const userData = await res.json();
  const userId = userData.id ?? userData._id;
  if (userId) {
    const savedImg = localStorage.getItem(`profileImg_${userId}`);
    if (savedImg) {
      userData.profileImg = savedImg;
    }
  }
  return userData;
};

export const getAdminProfile = async (token) => {
  const res = await fetch("http://localhost:5000/api/admin/profile", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) throw new Error("Failed to fetch admin profile");
  return res.json();
};

export const updateProfile = async (token, data) => {
  const res = await fetch("http://localhost:5000/api/auth/update-profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Profile update failed");
  }
  return res.json();
};

export const changePassword = async (token, data) => {
  const res = await fetch("http://localhost:5000/api/auth/change-password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Password update failed");
  }
  return res.json();
};

export const loginUser = async (data) => {
  const res = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error();
  return res.json();
};

export const loginAdmin = async (data) => {
  const res = await fetch("http://localhost:5000/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error();
  return res.json();
};

export const refreshUserToken = async (refreshToken) => {
  const res = await fetch("http://localhost:5000/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) throw new Error();
  return res.json();
};

export const refreshAdminToken = async (refreshToken) => {
  const res = await fetch("http://localhost:5000/api/admin/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) throw new Error();
  return res.json();
};

export const logoutUser = async (token) => {
  const res = await fetch("http://localhost:5000/api/auth/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) throw new Error();
  return res.json();
};

export const logoutAdmin = async (token) => {
  const res = await fetch("http://localhost:5000/api/admin/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) throw new Error();
  return res.json();
};

export const forgotPassword = async (email) => {
  const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(email)
  });

  if (!res.ok) throw new Error();
};
