const form = document.getElementById("form");
const messageTag = document.getElementById("message");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirm-password");
const notification = document.getElementById("notification");
const submitBtn = document.getElementById("submit");

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

form.style.display = "none";

let token, id;

window.addEventListener("DOMContentLoaded", async () => {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get(searchParams, prop) {
      return searchParams.get(prop);
    },
  });

  token = params.token;
  id = params.id;

  const res = await fetch("/auth/verify-pass-reset-token", {
    method: "POST",
    body: JSON.stringify({ token, id }),
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
  });

  if (!res.ok) {
    const { message } = await res.json();
    messageTag.innerText = message;
    messageTag.classList.add("error");
    return;
  }

  messageTag.style.display = "none";
  form.style.display = "block";
});

const displayNotification = (message, type) => {
  notification.style.display = "block";
  notification.innerText = message;
  notification.classList.add(type);
};

const handleSubmit = async (e) => {
  e.preventDefault();

  // validate
  if (!passwordRegex.test(password.value)) {
    return displayNotification("Password is required", "error");
  }

  if (password.value !== confirmPassword.value) {
    return displayNotification("Passwords do not match", "error");
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Loading...";

  const res = await fetch("/auth/reset-pass", {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify({ password: password.value, id, token }),
  });

  submitBtn.disabled = false;
  submitBtn.innerText = "Update Password";

  if (!res.ok) {
    const { message } = await res.json();
    return displayNotification(message, "error");
  }

  displayNotification("", "success");
  messageTag.style.display = "block";
  messageTag.innerText = "Password reset successfully";
};

form.addEventListener("submit", handleSubmit);
