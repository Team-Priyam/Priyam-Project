const API_BASE_URL = "/api";

export const getProfile = async (token) => {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch profile");
  }
  return data;
};

export const updateProfile = async (profileData, token) => {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to update profile");
  }
  return data;
};

export const getBorrowerDetail = async (borrowerId, token) => {
  const response = await fetch(`${API_BASE_URL}/borrowers/${borrowerId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch borrower details");
  }
  return data.data || data;
};

export const getBorrowers = async (searchQuery, token) => {
  const queryParam = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "";
  const response = await fetch(`${API_BASE_URL}/borrowers${queryParam}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch borrowers list");
  }
  return data.data || data;
};
