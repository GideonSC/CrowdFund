
function toggleForm() {
    var loginForm = document.getElementById("container");
    var signupForm = document.getElementById("container").nextElementSibling;

    loginForm.style.display = loginForm.style.display === "none" ? "block" : "none";
    signupForm.style.display = signupForm.style.display === "none" ? "block" : "none";
}
