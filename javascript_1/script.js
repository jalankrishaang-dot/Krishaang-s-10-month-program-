
let welcomeMessage = "Welcome to shotify user";

 if (enteredUsername == correctUsername && enteredpassword == correctPassword) 
{console.log("Login successful");
} 
else {
console.log("Login failed");
}

alert(welcomeMessage);

let message ="work in progress"
console.log(message);
document.getElementById("output").innerText= message;

let age = 13;
const birthyear = 2012;

let loginAttempts = 0;
const maxattempts = 3;
let timeleft = 30;
let timeinterval;

loginbutton.onclick =  function() {
     let enteredUsername = usernameInput.value;
    let enteredPassword = passwordInput.value;

    if (enteredUsername === correctUsername && enteredPassword === correctPassword) {
        loginMessage.innerHTML = "✅ Welcome to Shotify, " + enteredUsername + "!";
        loginMessage.style.color = "green";
        loginAttempts = 0; // reset attempts
     } else {
        loginAttempts++;
        loginMessage.innerHTML = "❌ Invalid login. Attempt " + loginAttempts;
        loginMessage.style.color = "red";

        if (loginAttempts >= maxAttempts) {
            // Start countdown
            loginButton.disabled = true;
            loginMessage.innerHTML = "🚫 Too many failed attempts. Try again in " + timeLeft + " seconds.";

            timerInterval = setInterval(function() {
                timeLeft--; // math operation
                loginMessage.innerHTML = "🚫 Too many failed attempts. Try again in " + timeLeft + " seconds.";

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    loginButton.disabled = false;
                    loginAttempts = 0;
                    timeLeft = 30; // reset timer
                    loginMessage.innerHTML = "You can try logging in again!";
                }
            }, 1000); // updates every second
        }
    }
};



console.log("my age is ", age);

window.onload = function() {
  
    let userChoice = confirm("🍪 Do you allow targeted cookies?");

    if (userChoice) {
        
        alert("Welcome! You may enter the website.");
       
        
    } else {
       
        alert("Sorry, you cannot log in to the website because you did not agree to the cookies.");
        
       
        document.body.innerHTML = "";
        document.body.style.backgroundColor = "black";


        setTimeout(function () {
            alert("sorry reload the page to try again (error 404).");
        }, 100);
    }
};

