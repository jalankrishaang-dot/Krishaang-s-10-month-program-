// Welcome message
let welcomeMessage = "Welcome to Shotify user";
alert(welcomeMessage);

// Work in progress log
let message = "work in progress";
console.log(message);
document.addEventListener("DOMContentLoaded", function() {
    // Make sure the element exists
    let output = document.getElementById("output");
    if (output) {
        output.innerText = message;
    }
});

// Login system variables
let loginAttempts = 0;
const maxAttempts = 3;
let timeLeft = 30;
let timerInterval;

// Dummy credentials for testing
const correctUsername = "user";
const correctPassword = "1234";

// Login function
function login() {
    const enteredUsername = document.getElementById("username").value;
    const enteredPassword = document.getElementById("password").value;
    const loginMessage = document.getElementById("loginMessage");
    const loginButton = document.getElementById("loginButton");

    if (enteredUsername === correctUsername && enteredPassword === correctPassword) {
        loginMessage.innerHTML = "✅ Welcome to Shotify, " + enteredUsername + "!";
        loginMessage.style.color = "green";
        loginAttempts = 0;
    } else {
        loginAttempts++;
        loginMessage.innerHTML = "❌ Invalid login. Attempt " + loginAttempts;
        loginMessage.style.color = "red";

        if (loginAttempts >= maxAttempts) {
            loginButton.disabled = true;
            loginMessage.innerHTML = "🚫 Too many failed attempts. Try again in " + timeLeft + " seconds.";

            timerInterval = setInterval(function () {
                timeLeft--;
                loginMessage.innerHTML = "🚫 Too many failed attempts. Try again in " + timeLeft + " seconds.";

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    loginButton.disabled = false;
                    loginAttempts = 0;
                    timeLeft = 30;
                    loginMessage.innerHTML = "You can try logging in again!";
                }
            }, 1000);
        }
    }
}

// Cookie consent system
window.onload = function () {
    let userChoice = confirm("🍪 Do you allow targeted cookies?");
    if (userChoice) {
        alert("Welcome! You may enter the website.");
    } else {
        alert("Sorry, you cannot log in to the website because you did not agree to the cookies.");
        document.body.innerHTML = "";
        document.body.style.backgroundColor = "black";

        setTimeout(function () {
            alert("Sorry, reload the page to try again (error 404).");
        }, 100);
    }
};

