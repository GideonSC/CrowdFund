function copyReferralLink() {
  var copyText = document.getElementById("referralLink");
  copyText.select();
  document.execCommand("copy");
  alert("Referral link copied to clipboard!");
}

function reinvest() {
  // for the re-invest btn
  alert("Re-Invest button clicked");
}

const loaderBanner = document.querySelector("#loader");
const withdrawbtn = document.getElementById("withdraw");

withdrawbtn.addEventListener("click", () => {
  loaderBanner.style.display = "flex";
});
loaderBanner.addEventListener("click", (e) => {
  if (e.target.id == "loader") {
    loaderBanner.style.display = "none";
  }
});

function logout() {
  fetch("/logout", {
    method: "DELETE",
  })
    .then(() => {
      window.location.href = "/id";
    })
    .catch((err) => {
      alert("error");
    });
}

const expiryDate = document.getElementById("expiryDate");
const time = document.getElementById("time-here"); // Output remaining hrs

function openWithdrawalForm() {
  document.getElementById("withdrawalForm").style.display = "block";
}

function closeWithdrawalForm() {
  document.getElementById("withdrawalForm").style.display = "none";
}

function submitWithdrawalForm() {
  const username = document.getElementById("username").value;
  const amount = document.getElementById("amount").value;

  // Validate data
  if (!username || !amount) {
    alert("Please fill in all fields.");
    return;
  }
}
