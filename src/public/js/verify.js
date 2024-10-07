const messageTag = document.getElementById("message");

window.addEventListener("DOMContentLoaded", async () => {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get(searchParams, prop) {
      return searchParams.get(prop);
    },
  });

  const token = params.token;
  const id = params.id;

  const res = await fetch("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ token, id }),
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
  });

  if (!res.ok) {
    const { message } = await res.json();
    console.log(res);
    messageTag.innerText = message;
    messageTag.classList.add("error");
    return;
  }
  messageTag.innerText = "Your account has been verified successfully";
});
