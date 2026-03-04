alert('Welcome to shotify user');

let age = 13;
const birthyear = 2012;

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

