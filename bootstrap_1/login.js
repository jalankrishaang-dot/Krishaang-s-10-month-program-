// Initialize EmailJS
(function () {
  emailjs.init({
    publicKey: "_LWT4vJ-3nDUWEQhb",
  });
})();

let currentEmail = "";
let generatedCode = "";
let codeExpiry = 0;

// SEND CODE
function sendCode() {

  const email = document.getElementById("emailInput").value.trim();
  const msg = document.getElementById("codeMsg");
  const btn = document.getElementById("sendBtn");

  msg.textContent = "";

  // Check email
  if (!email) {
    msg.textContent = "Please enter your email.";
    return;
  }

  // Button loading
  btn.disabled = true;
  btn.textContent = "Sending...";

  currentEmail = email;

  // Generate 6-digit code
  generatedCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  // 10 minute expiry
  codeExpiry = Date.now() + (10 * 60 * 1000);

  // Send Email
  emailjs.send(
    "service_ne7bctn",
    "template_fmtivhs",
    {
      to_email: currentEmail,
      code: generatedCode
    }
  )

  .then(function (response) {

    console.log("SUCCESS!", response.status, response.text);

    document.getElementById("emailStep").style.display = "none";
    document.getElementById("codeStep").style.display = "block";

    msg.textContent = "Code sent! Check your email.";

  })

  .catch(function (error) {

    console.error("FAILED...", error);

    msg.textContent =
      "Failed to send email. Check console.";

    btn.disabled = false;
    btn.textContent = "Send Code";
  });
}

// VERIFY CODE
function verifyCode() {

  const enteredCode =
    document.getElementById("codeInput").value.trim();

  const msg = document.getElementById("codeMsg");
  const btn = document.getElementById("verifyBtn");

  msg.textContent = "";

  if (!enteredCode) {
    msg.textContent = "Please enter the code.";
    return;
  }

  // Expired
  if (Date.now() > codeExpiry) {
    msg.textContent =
      "Code expired. Please resend a new one.";
    return;
  }

  // Wrong code
  if (enteredCode !== generatedCode) {
    msg.textContent = "Incorrect code.";
    return;
  }

  // Success
  btn.disabled = true;
  btn.textContent = "Logging in...";

  msg.textContent = "✅ Verified successfully!";

  // Save login state
  sessionStorage.setItem("shotifyLoggedIn", "true");

  // Redirect
  setTimeout(() => {
    window.location.href = "Shotify.html";
  }, 1000);
}

// RESEND
function resendCode() {

  document.getElementById("codeStep").style.display = "none";
  document.getElementById("emailStep").style.display = "block";

  document.getElementById("codeInput").value = "";

  const msg = document.getElementById("codeMsg");
  msg.textContent = "";

  const btn = document.getElementById("sendBtn");

  btn.disabled = false;
  btn.textContent = "Send Code";
}