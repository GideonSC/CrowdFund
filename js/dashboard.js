function startCountdown(durationInSeconds) {
    var countdownElement = document.getElementById('timer');
    var expiryDateElement = document.getElementById('expiryDate');

    var countdownInterval = setInterval(function() {
      var days = Math.floor(durationInSeconds / 86400);
      var hours = Math.floor((durationInSeconds % 86400) / 3600);
      var minutes = Math.floor((durationInSeconds % 3600) / 60);
      var seconds = durationInSeconds % 60;

      countdownElement.textContent = `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      if (--durationInSeconds < 0) {
        clearInterval(countdownInterval);
        countdownElement.textContent = "00:00:00:00";
        expiryDateElement.textContent = "Countdown expired!";
      }
    }, 1000);

    // Calculate and display expiry date
    var now = new Date();
    var expiryDate = new Date(now.getTime() + durationInSeconds * 1000);
    expiryDateElement.textContent = expiryDate.toDateString() + " " + expiryDate.toLocaleTimeString();
  }
  // Start countdown with 7 days (604800 seconds)
  startCountdown(604800);



function copyReferralLink() {
    var copyText = document.getElementById("referralLink");
    copyText.select();
    document.execCommand("copy");
    alert("Referral link copied to clipboard!");
  }

function reinvest() {
    // for the re-invest btn
    alert('Re-Invest button clicked');
}

function logout() {
    // i already did this logout part to take the user straight to the main page
    window.location.href = 'index.html';
}

document.getElementById('level').innerText = getCurrentLevel();
document.getElementById('balance').innerText = getBalance();

// Example functions for fetching dynamic data
function getCurrentLevel() {
  // You can fetch this value from the backend dynamically
  return 1;
}

function getBalance() {
  // You can fetch this value from the backend dynamically
  return 'N2000';
}



// withdrawal modal

document.getElementById('showForm').addEventListener('click', openWithdrawalForm);

function openWithdrawalForm() {
    document.getElementById('withdrawalForm').style.display = 'block';
}

function closeWithdrawalForm() {
    document.getElementById('withdrawalForm').style.display = 'none';
}

function submitWithdrawalForm() {
    const username = document.getElementById('username').value;
    const amount = document.getElementById('amount').value;

    // Validate data
    if (!username || !amount) {
        alert('Please fill in all fields.');
        return;
    }

  
}



