async function loginUser() {
    const phoneNumber = document.getElementById('phone').value;
    const password = document.getElementById('password').value;

    // Check if both fields are filled
    if (!phoneNumber || !password) {
        alert('Phone number and password are required.');
        return;
    }

    try {
        // Make a POST request to login the user
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber, password }) // Send phone number and password
        });

        const data = await response.json(); // Parse the JSON response

        if (response.ok) {
            alert('Login successful!');
            // Optionally, redirect the user to another page after successful login
            window.location.href = "/dashboard.html"; // Example redirection after login
        } else {
            alert(data.msg || 'Failed to login');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        alert('Failed to login. Please check your connection.');
    }
}

// Attach event listener to the login button
document.getElementById('loginBtn').addEventListener('click', loginUser);
